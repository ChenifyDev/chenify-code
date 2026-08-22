import { sql } from "drizzle-orm";
import { index, integer, pgTable, serial, text, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

const now = sql.raw("(now())::text");

export const works = pgTable(
    "works",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id").notNull(),
        title: text("title"),
        description: text("description"),
        cover: text("cover"),
        git_path: text("git_path"),
    },
    (table) => [index("idx_works_user_id").on(table.user_id)],
);

export const worksLikes = pgTable(
    "works_likes",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id").notNull(),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("works_likes_user_id_work_id_unique").on(table.user_id, table.work_id),
        index("idx_works_likes_user_id").on(table.user_id),
        index("idx_works_likes_work_id").on(table.work_id),
    ],
);

export const worksComments = pgTable(
    "works_comments",
    {
        id: serial("id").primaryKey(),
        work_id: integer("work_id")
            .notNull()
            .references(() => works.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        parent_id: integer("parent_id").references((): AnyPgColumn => worksComments.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_works_comments_work_id").on(table.work_id),
        index("idx_works_comments_user_id").on(table.user_id),
        index("idx_works_comments_parent_id").on(table.parent_id),
    ],
);

export const worksCommentLikes = pgTable(
    "works_comment_likes",
    {
        id: serial("id").primaryKey(),
        comment_id: integer("comment_id")
            .notNull()
            .references(() => worksComments.id, { onDelete: "cascade" }),
        user_id: integer("user_id").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("works_comment_likes_comment_id_user_id_unique").on(table.comment_id, table.user_id),
        index("idx_works_comment_likes_user_id").on(table.user_id),
    ],
);
