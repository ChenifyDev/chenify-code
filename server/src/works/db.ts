import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "node:path";
import * as schema from "./schema";

let cached: BunSQLiteDatabase<typeof schema> | null = null;

function init(): BunSQLiteDatabase<typeof schema> {
    const DB_PATH = join(import.meta.dir, "../../works.db");
    const sqlite = new Database(DB_PATH, { create: true });
    sqlite.run("PRAGMA foreign_keys = ON");
    const db = drizzle(sqlite, { schema, logger: false });
    const hasSchema = sqlite.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'works'").get() != null;
    if (!hasSchema) {
        const migrationsFolder = join(import.meta.dir, "../../drizzle-works");
        migrate(db, { migrationsFolder });
    }
    return db;
}

export function getWorksDb(): BunSQLiteDatabase<typeof schema> {
    cached ??= init();
    return cached;
}

export { schema };
