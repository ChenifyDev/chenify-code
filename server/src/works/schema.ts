import { type AnySQLiteColumn, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
const now = sql.raw("(datetime('now'))");

export const works = sqliteTable(
    "works",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id").notNull(),
        title: text("title"),
        description: text("description"),
        cover: text("cover"),
        git_path: text("git_path"),
    },
    (table) => [index("idx_works_user_id").on(table.user_id)],
);

export const likes = sqliteTable(
    "likes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id").notNull(),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("likes_user_id_work_id_unique").on(table.user_id, table.work_id),
        index("idx_likes_user_id").on(table.user_id),
        index("idx_likes_work_id").on(table.work_id),
    ],
);

export const comments = sqliteTable(
    "comments",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        parent_id: integer("parent_id").references((): AnySQLiteColumn => comments.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_comments_work_id").on(table.work_id),
        index("idx_comments_user_id").on(table.user_id),
        index("idx_comments_parent_id").on(table.parent_id),
    ],
);

export const commentLikes = sqliteTable(
    "comment_likes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        comment_id: integer("comment_id")
            .notNull()
            .references(() => comments.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("comment_likes_comment_id_user_id_unique").on(table.comment_id, table.user_id),
        index("idx_comment_likes_user_id").on(table.user_id),
    ],
);

export type WorkRow = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;
export type WorkCommentRowRaw = typeof comments.$inferSelect;
export type WorkCommentLikeRow = typeof commentLikes.$inferSelect;
