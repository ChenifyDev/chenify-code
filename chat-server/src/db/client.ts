import { eq } from "drizzle-orm";
import env from "../env";
import * as sqliteSchema from "./schema";
import * as pgSchema from "./pg-schema";

let chatDb: any = null;
let accountDb: any = null;

let neonDb: any = null;

function initNeonDb(): any {
    if (neonDb) return neonDb;
    const { neon } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
    const sql = neon(env.DATABASE_URL);
    neonDb = drizzle(sql, { schema: pgSchema });
    return neonDb;
}

function initSqliteDb(): any {
    if (chatDb) return chatDb;
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
    const { drizzle } = require("drizzle-orm/bun-sqlite") as typeof import("drizzle-orm/bun-sqlite");
    const sqlite = new Database(env.CHAT_DB_PATH, { create: true });
    sqlite.run("PRAGMA foreign_keys = ON");

    const CHAT_DDL = [
        `CREATE TABLE IF NOT EXISTS identity_keys (
            user_id INTEGER PRIMARY KEY NOT NULL,
            ed25519_pub TEXT NOT NULL,
            x25519_pub TEXT NOT NULL,
            proof_sig TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            conv_key TEXT NOT NULL,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            msg_id TEXT NOT NULL,
            nonce TEXT NOT NULL,
            ct TEXT NOT NULL,
            sig TEXT NOT NULL,
            ts INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            delivered_at TEXT,
            read_at TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conv_key)`,
        `CREATE INDEX IF NOT EXISTS idx_messages_pending ON messages (recipient_id, delivered_at)`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_msg_id_conv ON messages (conv_key, msg_id)`,
    ];
    for (const ddl of CHAT_DDL) sqlite.run(ddl);
    try {
        sqlite.run(`ALTER TABLE messages ADD COLUMN ts INTEGER NOT NULL DEFAULT 0`);
    } catch { /* column already exists */ }

    chatDb = drizzle(sqlite, { schema: sqliteSchema, logger: false });
    return chatDb;
}

export function isNeon(): boolean {
    return env.STORAGE_DRIVER === "neon";
}

export function getChatDb(): any {
    return isNeon() ? initNeonDb() : initSqliteDb();
}

export function getSchema(): typeof sqliteSchema | typeof pgSchema {
    return isNeon() ? pgSchema : sqliteSchema;
}

export async function getUserById(id: number): Promise<{ id: number; username: string; email: string; avatar: string | null } | null> {
    if (isNeon()) {
        const db = initNeonDb();
        const rows = await db.select().from(pgSchema.users).where(eq(pgSchema.users.id, id)).limit(1).execute();
        return rows[0] ?? null;
    }
    if (!accountDb) {
        const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
        accountDb = new Database(env.ACCOUNT_DB_PATH, { readonly: true } as any);
    }
    const stmt = accountDb.query("SELECT id, username, email, avatar FROM users WHERE id = ?");
    return stmt.get(id) as { id: number; username: string; email: string; avatar: string | null } | null;
}

export { sqliteSchema, pgSchema };
