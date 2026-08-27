import { Hono } from "hono";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { getChatDb, getSchema } from "../db/client";
import { getAuthUser } from "../auth";

export const routes = new Hono();

routes.get("/conversations", async (c) => {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ message: "unauthorized" }, 401);

    const db = getChatDb();
    const schema = getSchema();

    const rows = await db.execute(
        sql`SELECT
            CASE WHEN sender_id = ${user.id} THEN recipient_id ELSE sender_id END AS peer_id,
            MAX(created_at) AS last_time,
            SUM(CASE WHEN recipient_id = ${user.id} AND delivered_at IS NULL THEN 1 ELSE 0 END) AS unread_count
        FROM messages
        WHERE sender_id = ${user.id} OR recipient_id = ${user.id}
        GROUP BY peer_id
        ORDER BY last_time DESC`,
    ) as { peer_id: number; last_time: string; unread_count: number }[];

    return c.json({
        conversations: rows.map((r: any) => ({
            peer_id: r.peer_id,
            last_time: r.last_time,
            unread_count: r.unread_count,
        })),
    });
});

routes.get("/convs/:peer/messages", async (c) => {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ message: "unauthorized" }, 401);

    const peerId = Number(c.req.param("peer"));
    if (!Number.isFinite(peerId) || peerId <= 0) {
        return c.json({ message: "invalid peer id" }, 400);
    }

    const url = new URL(c.req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));

    const db = getChatDb();
    const schema = getSchema();
    const ck = [Math.min(user.id, peerId), Math.max(user.id, peerId)].join("_");

    const conditions = [eq(schema.messages.conv_key, ck)];

    if (cursor) {
        conditions.push(lt(schema.messages.id, Number(cursor)));
    }

    const rows = await db
        .select()
        .from(schema.messages)
        .where(and(...conditions))
        .orderBy(desc(schema.messages.id))
        .limit(limit)
        .execute();

    return c.json({
        messages: rows.map((r: any) => ({
            id: r.id,
            sender_id: r.sender_id,
            recipient_id: r.recipient_id,
            msg_id: r.msg_id,
            env: { v: 1, nonce: r.nonce, ct: r.ct, sig: r.sig, ts: r.ts },
            created_at: r.created_at,
            delivered_at: r.delivered_at,
            read_at: r.read_at,
        })),
        next_cursor: rows.length === limit ? String(rows[rows.length - 1]!.id) : null,
    });
});
