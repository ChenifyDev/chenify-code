import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getChatDb, getSchema } from "../db/client";
import { getAuthUser } from "../auth";
import { isOnline } from "../rooms";
import { ed25519 } from "@noble/curves/ed25519.js";

export const routes = new Hono();

const KEYS_PREFIX = new TextEncoder().encode("chenify-keys/v1:");

function verifyProof(
    userId: number,
    x25519Pub: Uint8Array,
    ed25519Pub: Uint8Array,
    proofSig: Uint8Array,
): boolean {
    const msg = new Uint8Array(KEYS_PREFIX.length + 4 + 32);
    msg.set(KEYS_PREFIX, 0);
    new DataView(msg.buffer, KEYS_PREFIX.length).setUint32(0, userId);
    msg.set(x25519Pub, KEYS_PREFIX.length + 4);
    return ed25519.verify(proofSig, msg, ed25519Pub);
}

routes.post("/keys", async (c) => {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ message: "unauthorized" }, 401);

    const body = await c.req.json<{ ed25519_pub: string; x25519_pub: string; proof_sig: string }>();
    if (!body.ed25519_pub || !body.x25519_pub || !body.proof_sig) {
        return c.json({ message: "missing fields: ed25519_pub, x25519_pub, proof_sig" }, 400);
    }

    const edPub = b64ToBytes(body.ed25519_pub);
    const xPub = b64ToBytes(body.x25519_pub);
    const sig = b64ToBytes(body.proof_sig);

    if (edPub.length !== 32 || xPub.length !== 32 || sig.length !== 64) {
        return c.json({ message: "invalid key or signature length" }, 400);
    }

    if (!verifyProof(user.id, xPub, edPub, sig)) {
        return c.json({ message: "invalid proof signature" }, 400);
    }

    const db = getChatDb();
    const schema = getSchema();
    await db.insert(schema.identityKeys)
        .values({
            user_id: user.id,
            ed25519_pub: body.ed25519_pub,
            x25519_pub: body.x25519_pub,
            proof_sig: body.proof_sig,
        })
        .onConflictDoUpdate({
            target: schema.identityKeys.user_id,
            set: {
                ed25519_pub: body.ed25519_pub,
                x25519_pub: body.x25519_pub,
                proof_sig: body.proof_sig,
                updated_at: new Date().toISOString(),
            },
        })
        .execute();

    return c.json({ ok: true });
});

routes.get("/keys/:userId", async (c) => {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ message: "unauthorized" }, 401);

    const targetId = Number(c.req.param("userId"));
    if (!Number.isFinite(targetId) || targetId <= 0) {
        return c.json({ message: "invalid userId" }, 400);
    }

    const db = getChatDb();
    const schema = getSchema();
    const rows = await db.select().from(schema.identityKeys).where(eq(schema.identityKeys.user_id, targetId)).limit(1).execute();
    const row = rows[0];

    if (!row) {
        return c.json({ message: "keys not found" }, 404);
    }

    return c.json({
        user_id: row.user_id,
        ed25519_pub: row.ed25519_pub,
        x25519_pub: row.x25519_pub,
        updated_at: row.updated_at,
        online: isOnline(targetId),
    });
});

function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
