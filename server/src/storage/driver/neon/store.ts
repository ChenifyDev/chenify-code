import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dbSchema from "../../../db/pg-schema";
import * as worksSchema from "../../../works/pg-schema";
import type { CollectionStore } from "../../store";

const NO_ID = new Set(["follows", "post_tags", "draft_tags"]);

const PK_COLUMNS: Record<string, string[]> = {
    follows: ["follower_id", "following_id"],
    post_tags: ["post_id", "tag_id"],
    draft_tags: ["draft_id", "tag_id"],
};

const TABLE_KEY: Record<string, string> = {
    post_images: "postImages",
    post_tags: "postTags",
    comment_likes: "commentLikes",
    draft_images: "draftImages",
    draft_tags: "draftTags",
    works_likes: "worksLikes",
    works_comments: "worksComments",
    works_comment_likes: "worksCommentLikes",
};

let db: any;

function connectionString(): string {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Neon driver requires DATABASE_URL");
    return url;
}

function getDb(): any {
    if (!db) {
        const sql = neon(connectionString());
        db = drizzle(sql, { schema: { ...dbSchema, ...worksSchema } });
    }
    return db;
}

function resolve(name: string): { table: any; hasId: boolean } {
    const key = TABLE_KEY[name] ?? name;
    const table = (dbSchema as any)[key] ?? (worksSchema as any)[key];
    if (table == null) throw new Error(`unknown collection: ${name}`);
    return { table, hasId: !NO_ID.has(name) };
}

function pkColumns(name: string): string[] {
    return PK_COLUMNS[name] ?? ["id"];
}

function pkEqual(table: any, row: any, cols: string[]) {
    return cols.length === 1 ? eq(table[cols[0]!], row[cols[0]!]) : and(...cols.map((col) => eq(table[col], row[col])));
}

function pkKey(row: any, cols: string[]): string {
    return cols.map((col) => String(row[col])).join("|");
}

export function neonCollectionStore(): CollectionStore {
    const store: CollectionStore = {
        async read<T>(name: string): Promise<T[]> {
            const { table } = resolve(name);
            return getDb().select().from(table).execute() as Promise<T[]>;
        },

        async write<T>(name: string, rows: T[]): Promise<void> {
            const { table } = resolve(name);
            const existing = (await store.read<any>(name)) as any[];
            const cols = pkColumns(name);
            const wanted = new Set(rows.map((row) => pkKey(row, cols)));
            for (const row of existing) {
                if (!wanted.has(pkKey(row, cols)))
                    getDb()
                        .delete(table)
                        .where(pkEqual(table, row, cols))
                        .execute();
            }
            const known = new Set(existing.map((row) => pkKey(row, cols)));
            for (const row of rows) {
                if (known.has(pkKey(row, cols))) {
                    getDb()
                        .update(table)
                        .set(row)
                        .where(pkEqual(table, row, cols))
                        .execute();
                } else {
                    await getDb().insert(table).values(row).execute();
                    known.add(pkKey(row, cols));
                }
            }
        },

        async insert<T extends { id: number }>(name: string, row: Omit<T, "id">): Promise<T> {
            const { table } = resolve(name);
            const rows = (await getDb().insert(table).values(row).returning().execute()) as T[];
            return rows[0] as T;
        },

        async append<T>(name: string, row: T): Promise<T> {
            const { table } = resolve(name);
            await getDb().insert(table).values(row).onConflictDoNothing().execute();
            return row;
        },

        async getById<T extends { id: number }>(name: string, id: number): Promise<T | undefined> {
            const rows = (await store.read<any>(name)) as any[];
            return rows.find((row) => (row as any).id === id) as T | undefined;
        },

        async updateById<T extends { id: number }>(
            name: string,
            id: number,
            patch: Partial<T>,
        ): Promise<T | undefined> {
            const { table, hasId } = resolve(name);
            if (!hasId) return undefined;
            const existing = (await store.getById<any>(name, id)) as any;
            if (!existing) return undefined;
            await getDb().update(table).set(patch).where(eq(table.id, id)).execute();
            return { ...existing, ...patch } as T;
        },

        async deleteWhere<T>(name: string, predicate: (row: T) => boolean): Promise<void> {
            const { table } = resolve(name);
            const rows = (await store.read<any>(name)) as any[];
            const cols = pkColumns(name);
            for (const row of rows) {
                if (predicate(row as T))
                    await getDb()
                        .delete(table)
                        .where(pkEqual(table, row, cols))
                        .execute();
            }
        },

        async removeById(name: string, id: number): Promise<void> {
            const { table, hasId } = resolve(name);
            if (!hasId) return;
            await getDb().delete(table).where(eq(table.id, id)).execute();
        },

        async insertIfAbsent<T extends { id: number }>(name: string, row: T): Promise<void> {
            const existing = await store.getById<any>(name, (row as any).id);
            if (existing) return;
            const { table } = resolve(name);
            await getDb().insert(table).values(row).onConflictDoNothing().execute();
        },
    };
    return store;
}
