import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import env from "../env";
import * as schema from "./schema";

let cachedChat: BunSQLiteDatabase<typeof schema> | null = null;
let cachedAccount: Database | null = null;

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

function initChatDb(): BunSQLiteDatabase<typeof schema> {
    const sqlite = new Database(env.CHAT_DB_PATH, { create: true });
    sqlite.run("PRAGMA foreign_keys = ON");
    for (const sql of CHAT_DDL) {
        sqlite.run(sql);
    }
    try {
        sqlite.run(`ALTER TABLE messages ADD COLUMN ts INTEGER NOT NULL DEFAULT 0`);
    } catch {
        // column already exists
    }
    return drizzle(sqlite, { schema, logger: false });
}

function initAccountDb(): Database {
    return new Database(env.ACCOUNT_DB_PATH, { readonly: true } as any);
}

export function getChatDb(): BunSQLiteDatabase<typeof schema> {
    cachedChat ??= initChatDb();
    return cachedChat;
}

export function getAccountDb(): Database {
    cachedAccount ??= initAccountDb();
    return cachedAccount;
}

export { schema };
