import { and, eq } from "drizzle-orm";
import { db as appDb } from "../../../db/client";
import { db as worksDb } from "../../../works/db";
import * as appSchema from "../../../db/schema";
import * as worksSchema from "../../../works/schema";
import type { CollectionStore } from "../../store";

const appTables: Record<string, unknown> = {
    users: appSchema.users,
    posts: appSchema.posts,
    post_images: appSchema.postImages,
    tags: appSchema.tags,
    post_tags: appSchema.postTags,
    favorites: appSchema.favorites,
    likes: appSchema.likes,
    comments: appSchema.comments,
    comment_likes: appSchema.commentLikes,
    follows: appSchema.follows,
    notifications: appSchema.notifications,
    drafts: appSchema.drafts,
    draft_images: appSchema.draftImages,
    draft_tags: appSchema.draftTags,
};

const worksTables: Record<string, unknown> = {
    works: worksSchema.works,
    works_likes: worksSchema.likes,
    works_comments: worksSchema.comments,
    works_comment_likes: worksSchema.commentLikes,
};

const NO_ID = new Set(["follows", "post_tags", "draft_tags"]);

const PK_COLUMNS: Record<string, string[]> = {
    follows: ["follower_id", "following_id"],
    post_tags: ["post_id", "tag_id"],
    draft_tags: ["draft_id", "tag_id"],
};

function resolve(name: string): { db: any; table: any; hasId: boolean } {
    const inApp = name in appTables;
    const table = inApp ? appTables[name] : worksTables[name];
    if (table == null) throw new Error(`unknown collection: ${name}`);
    return { db: inApp ? appDb : worksDb, table, hasId: !NO_ID.has(name) };
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

export function sqliteCollectionStore(): CollectionStore {
    const store: CollectionStore = {
        async read<T>(name: string): Promise<T[]> {
            const { db, table } = resolve(name);
            return db.select().from(table).all() as T[];
        },

        async write<T>(name: string, rows: T[]): Promise<void> {
            const { db, table, hasId } = resolve(name);
            const existing = (await store.read<any>(name)) as any[];
            const cols = pkColumns(name);
            const wanted = new Set(rows.map((row) => pkKey(row, cols)));
            for (const row of existing) {
                if (!wanted.has(pkKey(row, cols)))
                    db.delete(table)
                        .where(pkEqual(table, row, cols))
                        .run();
            }
            const known = new Set(existing.map((row) => pkKey(row, cols)));
            for (const row of rows) {
                if (known.has(pkKey(row, cols))) {
                    db.update(table)
                        .set(row)
                        .where(pkEqual(table, row, cols))
                        .run();
                } else {
                    db.insert(table).values(row).run();
                    known.add(pkKey(row, cols));
                }
            }
            void hasId;
        },

        async insert<T extends { id: number }>(name: string, row: Omit<T, "id">): Promise<T> {
            const { db, table } = resolve(name);
            const rows = (await store.read<any>(name)) as any[];
            const nextId = rows.reduce((max, r) => Math.max(max, (r as any).id ?? 0), 0) + 1;
            const full = { ...row, id: nextId } as T;
            db.insert(table).values(full).run();
            return full;
        },

        async append<T>(name: string, row: T): Promise<T> {
            const { db, table } = resolve(name);
            db.insert(table).values(row).onConflictDoNothing().run();
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
            const { db, table, hasId } = resolve(name);
            if (!hasId) return undefined;
            const existing = (await store.getById<any>(name, id)) as any;
            if (!existing) return undefined;
            db.update(table).set(patch).where(eq(table.id, id)).run();
            return { ...existing, ...patch } as T;
        },

        async deleteWhere<T>(name: string, predicate: (row: T) => boolean): Promise<void> {
            const { db, table } = resolve(name);
            const rows = (await store.read<any>(name)) as any[];
            const cols = pkColumns(name);
            for (const row of rows) {
                if (predicate(row as T))
                    db.delete(table)
                        .where(pkEqual(table, row, cols))
                        .run();
            }
        },

        async removeById(name: string, id: number): Promise<void> {
            const { db, table, hasId } = resolve(name);
            if (!hasId) return;
            db.delete(table).where(eq(table.id, id)).run();
        },

        async insertIfAbsent<T extends { id: number }>(name: string, row: T): Promise<void> {
            const existing = await store.getById<any>(name, (row as any).id);
            if (existing) return;
            const { db, table } = resolve(name);
            db.insert(table).values(row).onConflictDoNothing().run();
        },
    };
    return store;
}
