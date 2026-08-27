import { eq, and, isNull, asc } from "drizzle-orm";
import { getChatDb, getSchema } from "./db/client";
import { deriveSessionKey } from "./crypto/session";
import { open } from "./crypto/envelope";
import { buildCanonicalHeader } from "./crypto/canonical";

type WsLike = { send(data: string | ArrayBufferLike | Uint8Array): void };

const onlineMap = new Map<number, Set<WsLike>>();

export function registerWs(userId: number, ws: WsLike): void {
    let set = onlineMap.get(userId);
    if (!set) {
        set = new Set();
        onlineMap.set(userId, set);
    }
    set.add(ws);
}

export function unregisterWs(userId: number, ws: WsLike): void {
    const set = onlineMap.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) onlineMap.delete(userId);
}

export function isOnline(userId: number): boolean {
    const set = onlineMap.get(userId);
    return !!set && set.size > 0;
}

export function onlineCount(userId: number): number {
    return onlineMap.get(userId)?.size ?? 0;
}

export function broadcastToUser(userId: number, data: string): void {
    const set = onlineMap.get(userId);
    if (!set) return;
    for (const ws of set) {
        ws.send(data);
    }
}

export function convKey(a: number, b: number): string {
    return `${Math.min(a, b)}_${Math.max(a, b)}`;
}

function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function deliverPending(
    recipientId: number,
    getPrivateKey: (userId: number) => Uint8Array | null | Promise<Uint8Array | null>,
    getPeerPubKey: (userId: number) => Uint8Array | null | Promise<Uint8Array | null>,
): Promise<number> {
    const db = getChatDb();
    const schema = getSchema();
    const pending = await db
        .select()
        .from(schema.messages)
        .where(and(eq(schema.messages.recipient_id, recipientId), isNull(schema.messages.delivered_at)))
        .orderBy(asc(schema.messages.id))
        .execute();

    let count = 0;
    for (const msg of pending) {
        const recipientPrivKey = await getPrivateKey(recipientId);
        const senderPubKey = await getPeerPubKey(msg.sender_id);
        if (!recipientPrivKey || !senderPubKey) continue;

        const sk = deriveSessionKey(recipientPrivKey, senderPubKey, msg.sender_id, recipientId);
        const header = buildCanonicalHeader(msg.sender_id, msg.recipient_id, msg.ts ?? new Date(msg.created_at).getTime(), b64ToBytes(msg.nonce));
        const pt = open(
            {
                nonce: b64ToBytes(msg.nonce),
                ct: b64ToBytes(msg.ct),
                sig: b64ToBytes(msg.sig),
                header,
            },
            sk,
            senderPubKey,
        );
        if (!pt) continue;

        await db.update(schema.messages)
            .set({ delivered_at: new Date().toISOString() })
            .where(eq(schema.messages.id, msg.id))
            .execute();

        broadcastToUser(recipientId, JSON.stringify({
            t: "dm.recv",
            mid: msg.id,
            from: msg.sender_id,
            env: { v: 1, nonce: msg.nonce, ct: msg.ct, sig: msg.sig, ts: msg.ts ?? new Date(msg.created_at).getTime() },
        }));
        count++;
    }
    return count;
}
