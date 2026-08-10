import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

const now = sql`(datetime('now'))`;

export const works = sqliteTable(
    "works",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id").notNull(),
        title: text("title").notNull(),
        description: text("description").notNull().default(""),
        cover: text("cover").notNull().default(""),
        parent_id: integer("parent_id").references((): AnySQLiteColumn => works.id, { onDelete: "set null" }),
        created_at: text("created_at").notNull().default(now),
        updated_at: text("updated_at").notNull().default(now),
    },
    (table) => [
        index("idx_works_user_id").on(table.user_id),
        index("idx_works_parent_id").on(table.parent_id),
        index("idx_works_created_at").on(table.created_at),
    ],
);

export const workFiles = sqliteTable(
    "work_files",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        path: text("path").notNull(),
        size: integer("size").notNull().default(0),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [index("idx_work_files_work_id").on(table.work_id)],
);

export const workLikes = sqliteTable(
    "work_likes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("work_likes_user_id_work_id_unique").on(table.work_id, table.user_id),
        index("idx_work_likes_user_id").on(table.user_id),
    ],
);

export const workFavorites = sqliteTable(
    "work_favorites",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("work_favorites_user_id_work_id_unique").on(table.work_id, table.user_id),
        index("idx_work_favorites_user_id").on(table.user_id),
    ],
);

export const workComments = sqliteTable(
    "work_comments",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        parent_id: integer("parent_id").references((): AnySQLiteColumn => workComments.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_work_comments_work_id").on(table.work_id),
        index("idx_work_comments_user_id").on(table.user_id),
        index("idx_work_comments_parent_id").on(table.parent_id),
    ],
);

export const workCommentLikes = sqliteTable(
    "work_comment_likes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_comment_id: integer("work_comment_id")
            .notNull()
            .references(() => workComments.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("work_comment_likes_comment_id_user_id_unique").on(table.work_comment_id, table.user_id),
        index("idx_work_comment_likes_user_id").on(table.user_id),
    ],
);

export type WorkRow = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;
export type WorkFileRow = typeof workFiles.$inferSelect;
export type WorkCommentRowRaw = typeof workComments.$inferSelect;
export type WorkCommentLikeRow = typeof workCommentLikes.$inferSelect;