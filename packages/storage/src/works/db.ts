import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "node:path";
import * as schema from "./schema";

const SRV_DIR = process.cwd();

let cached: BetterSQLite3Database<typeof schema> | null = null;

function init(): BetterSQLite3Database<typeof schema> {
    const DB_PATH = join(SRV_DIR, "works.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema, logger: false });
    const hasSchema =
        sqlite
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'works'")
            .get() != null;
    if (!hasSchema) {
        const migrationsFolder = join(SRV_DIR, "drizzle-works");
        migrate(db, { migrationsFolder });
    }
    return db;
}

export function getWorksDb(): BetterSQLite3Database<typeof schema> {
    cached ??= init();
    return cached;
}

export { schema };