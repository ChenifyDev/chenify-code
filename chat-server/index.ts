import { eq, and } from "drizzle-orm";
import { ed25519 } from "@noble/curves/ed25519.js";
import env from "./src/env";
import app from "./src/app";
import { getChatDb, getSchema } from "./src/db/client";
import { registerWs, unregisterWs, broadcastToUser, deliverPending } from "./src/rooms";
import { deriveSessionKey } from "./src/crypto/session";
import { buildCanonicalHeader } from "./src/crypto/canonical";
import { verifyToken } from "./src/auth";

function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function loadKeys(userId: number): Promise<{ ed25519_pub: Uint8Array; x25519_pub: Uint8Array } | null> {
    const db = getChatDb();
    const schema = getSchema();
    const rows = await db.select().from(schema.identityKeys).where(eq(schema.identityKeys.user_id, userId)).limit(1).execute();
    const row = rows[0];
    if (!row) return null;
    return {
        ed25519_pub: b64ToBytes(row.ed25519_pub),
        x25519_pub: b64ToBytes(row.x25519_pub),
    };
}

const MAX_FRAME_SIZE = 128 * 1024;

const server = Bun.serve<{ userId: number }>({
    port: env.CHAT_PORT,
    async fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname === "/ws" && req.headers.get("upgrade")?.toLowerCase() === "websocket") {
            const token = url.searchParams.get("token");
            if (!token) return new Response("unauthorized", { status: 401 });
            const payload = await verifyToken(token);
            if (!payload || payload.sub == null) return new Response("unauthorized", { status: 401 });
            const upgraded = server.upgrade(req, { data: { userId: Number(payload.sub) } });
            if (!upgraded) return new Response("upgrade failed", { status: 500 });
            return new Response();
        }
        return app.fetch(req);
    },
    websocket: {
        open(ws) {
            const userId = (ws as any).data?.userId as number | undefined;
            if (!userId) {
                ws.close(1008, "not authenticated");
                return;
            }
            registerWs(userId, ws);
            ws.send(JSON.stringify({ t: "hello", user_id: userId }));
            deliverPending(userId, (uid) => loadKeys(uid).then((k) => k?.x25519_pub ?? null), (uid) => loadKeys(uid).then((k) => k?.x25519_pub ?? null));
        },
        async message(ws, message) {
            const userId = (ws as any).data?.userId as number | undefined;
            if (!userId || typeof message !== "string") return;
            if (message.length > MAX_FRAME_SIZE) return;
            let frame: unknown;
            try {
                frame = JSON.parse(message);
            } catch {
                ws.send(JSON.stringify({ t: "error", code: "bad_frame", message: "invalid JSON" }));
                return;
            }
            await handleClientFrame(userId, ws, frame);
        },
        close(ws) {
            const userId = (ws as any).data?.userId as number | undefined;
            if (userId) unregisterWs(userId, ws);
        },
    },
});

async function handleClientFrame(userId: number, ws: any, frame: any): Promise<void> {
    if (frame.t === "dm.send") {
        await handleDmSend(userId, ws, frame);
    } else if (frame.t === "dm.delivered" && Array.isArray(frame.ids)) {
        await handleDmDelivered(frame.ids);
    } else if (frame.t === "dm.read" && typeof frame.conv === "string") {
        await handleDmRead(userId, ws, frame);
    }
}

async function handleDmSend(userId: number, ws: any, frame: any): Promise<void> {
    if (typeof frame.id !== "string" || typeof frame.to !== "number" || !frame.env) {
        ws.send(JSON.stringify({ t: "ack", ref: frame.id ?? "", ok: false, error: "invalid frame" }));
        return;
    }
    if (frame.to === userId) {
        ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "cannot send to self" }));
        return;
    }

    const senderKeys = await loadKeys(userId);
    const recipientKeys = await loadKeys(frame.to);
    if (!senderKeys || !recipientKeys) {
        ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "missing keys" }));
        return;
    }

    const envFrame = frame.env;
    const nonceBytes = b64ToBytes(envFrame.nonce);
    const ctBytes = b64ToBytes(envFrame.ct);
    const sigBytes = b64ToBytes(envFrame.sig);

    if (nonceBytes.length !== 12 || sigBytes.length !== 64) {
        ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "invalid nonce or sig length" }));
        return;
    }

    const ck = [Math.min(userId, frame.to), Math.max(userId, frame.to)].join("_");
    const header = buildCanonicalHeader(userId, frame.to, envFrame.ts, nonceBytes);
    const sk = deriveSessionKey(senderKeys.x25519_pub, recipientKeys.x25519_pub, userId, frame.to);

    const validSig = ed25519.verify(sigBytes, new Uint8Array([...header, ...ctBytes]), senderKeys.ed25519_pub);
    if (!validSig) {
        ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "invalid signature" }));
        return;
    }

    const db = getChatDb();
    const schema = getSchema();
    try {
        const rows = await db.insert(schema.messages)
            .values({
                conv_key: ck,
                sender_id: userId,
                recipient_id: frame.to,
                msg_id: frame.id,
                nonce: envFrame.nonce,
                ct: envFrame.ct,
                sig: envFrame.sig,
                ts: envFrame.ts,
            })
            .returning({ id: schema.messages.id })
            .execute();

        const mid = rows[0]!.id;
        ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: true }));

        broadcastToUser(frame.to, JSON.stringify({
            t: "dm.recv",
            mid,
            from: userId,
            env: { v: 1, nonce: envFrame.nonce, ct: envFrame.ct, sig: envFrame.sig, ts: envFrame.ts },
        }));
    } catch (e: any) {
        if (String(e.message).includes("UNIQUE")) {
            ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "duplicate message" }));
        } else {
            ws.send(JSON.stringify({ t: "ack", ref: frame.id, ok: false, error: "db error" }));
        }
    }
}

async function handleDmDelivered(ids: number[]): Promise<void> {
    const db = getChatDb();
    const schema = getSchema();
    for (const mid of ids) {
        await db.update(schema.messages)
            .set({ delivered_at: new Date().toISOString() })
            .where(eq(schema.messages.id, mid))
            .execute();
    }
}

async function handleDmRead(userId: number, ws: any, frame: any): Promise<void> {
    const parts = frame.conv.split("_").map(Number);
    const peerId = parts.find((n: number) => n !== userId);
    if (!peerId || parts.length !== 2) return;

    const db = getChatDb();
    const schema = getSchema();
    await db.update(schema.messages)
        .set({ read_at: new Date().toISOString() })
        .where(
            and(
                eq(schema.messages.conv_key, frame.conv),
                eq(schema.messages.recipient_id, userId),
            ),
        )
        .execute();

    broadcastToUser(peerId, JSON.stringify({ t: "dm.read", by: userId, conv: frame.conv }));
}

console.log(`[chat-server] listening on :${env.CHAT_PORT}`);
