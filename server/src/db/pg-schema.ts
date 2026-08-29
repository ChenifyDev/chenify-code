import { relations, sql } from "drizzle-orm";
import {
    boolean,
    doublePrecision,
    index,
    integer,
    primaryKey,
    pgTable,
    serial,
    text,
    uniqueIndex,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";

const now = sql.raw("(now())::text");

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    avatar: text("avatar"),
    created_at: text("created_at").notNull().default(now),
    is_favorites_public: boolean("is_favorites_public").notNull().default(true),
    is_follows_public: boolean("is_follows_public").notNull().default(true),
});

export const posts = pgTable(
    "posts",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
        pinned: boolean("pinned").notNull().default(false),
    },
    (table) => [index("idx_posts_user_id").on(table.user_id), index("idx_posts_created_at").on(table.created_at)],
);

export const postImages = pgTable(
    "post_images",
    {
        id: serial("id").primaryKey(),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        path: text("path").notNull(),
    },
    (table) => [index("idx_post_images_post_id").on(table.post_id)],
);

export const tags = pgTable("tags", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
});

export const postTags = pgTable(
    "post_tags",
    {
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        tag_id: integer("tag_id")
            .notNull()
            .references(() => tags.id),
    },
    (table) => [primaryKey({ columns: [table.post_id, table.tag_id] }), index("idx_post_tags_tag_id").on(table.tag_id)],
);

export const favorites = pgTable(
    "favorites",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("favorites_user_id_post_id_unique").on(table.user_id, table.post_id),
        index("idx_favorites_user_id").on(table.user_id),
        index("idx_favorites_post_id").on(table.post_id),
    ],
);

export const likes = pgTable(
    "likes",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("likes_user_id_post_id_unique").on(table.user_id, table.post_id),
        index("idx_likes_user_id").on(table.user_id),
        index("idx_likes_post_id").on(table.post_id),
    ],
);

export const comments = pgTable(
    "comments",
    {
        id: serial("id").primaryKey(),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        parent_id: integer("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_comments_post_id").on(table.post_id),
        index("idx_comments_user_id").on(table.user_id),
        index("idx_comments_parent_id").on(table.parent_id),
    ],
);

export const commentLikes = pgTable(
    "comment_likes",
    {
        id: serial("id").primaryKey(),
        comment_id: integer("comment_id")
            .notNull()
            .references(() => comments.id, { onDelete: "cascade" }),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        uniqueIndex("comment_likes_comment_id_user_id_unique").on(table.comment_id, table.user_id),
        index("idx_comment_likes_user_id").on(table.user_id),
    ],
);

export const follows = pgTable(
    "follows",
    {
        follower_id: integer("follower_id")
            .notNull()
            .references(() => users.id),
        following_id: integer("following_id")
            .notNull()
            .references(() => users.id),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        primaryKey({ columns: [table.follower_id, table.following_id] }),
        index("idx_follows_follower").on(table.follower_id),
        index("idx_follows_following").on(table.following_id),
    ],
);

export const notifications = pgTable(
    "notifications",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        actor_id: integer("actor_id")
            .notNull()
            .references(() => users.id),
        type: text("type", { enum: ["post_comment", "post_reply", "post_tip", "user_tip"] }).notNull(),
        post_id: integer("post_id"),
        work_id: integer("work_id"),
        comment_id: integer("comment_id"),
        data: text("data"),
        is_read: boolean("is_read").notNull().default(false),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_notifications_user").on(table.user_id),
        index("idx_notifications_user_read").on(table.user_id, table.is_read),
    ],
);

export const coinTransactions = pgTable(
    "coin_transactions",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        post_id: integer("post_id").references(() => posts.id, { onDelete: "set null" }),
        to_user_id: integer("to_user_id").references(() => users.id),
        type: text("type", { enum: ["daily", "tip_out", "tip_in"] }).notNull(),
        amount: doublePrecision("amount").notNull(),
        reward_date: text("reward_date"),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_coin_transactions_user_id").on(table.user_id),
        index("idx_coin_transactions_post_id").on(table.post_id),
        index("idx_coin_transactions_to_user_id").on(table.to_user_id),
        index("idx_coin_transactions_created_at").on(table.created_at),
    ],
);

export const drafts = pgTable(
    "drafts",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        status: text("status", { enum: ["draft", "published"] })
            .notNull()
            .default("draft"),
        post_id: integer("post_id").references(() => posts.id),
        created_at: text("created_at").notNull().default(now),
        updated_at: text("updated_at").notNull().default(now),
    },
    (table) => [index("idx_drafts_user_id").on(table.user_id)],
);

export const draftImages = pgTable(
    "draft_images",
    {
        id: serial("id").primaryKey(),
        draft_id: integer("draft_id")
            .notNull()
            .references(() => drafts.id, { onDelete: "cascade" }),
        path: text("path").notNull(),
    },
    (table) => [index("idx_draft_images_draft_id").on(table.draft_id)],
);

export const draftTags = pgTable(
    "draft_tags",
    {
        draft_id: integer("draft_id")
            .notNull()
            .references(() => drafts.id, { onDelete: "cascade" }),
        tag_id: integer("tag_id")
            .notNull()
            .references(() => tags.id),
    },
    (table) => [
        primaryKey({ columns: [table.draft_id, table.tag_id] }),
        index("idx_draft_tags_tag_id").on(table.tag_id),
    ],
);

export const usersRelations = relations(users, ({ many }) => ({
    posts: many(posts),
    favorites: many(favorites),
    likes: many(likes),
    comments: many(comments),
    followings: many(follows, { relationName: "follower" }),
    followers: many(follows, { relationName: "following" }),
    drafts: many(drafts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    author: one(users, { fields: [posts.user_id], references: [users.id] }),
    images: many(postImages),
    tags: many(postTags),
    favorites: many(favorites),
    likes: many(likes),
    comments: many(comments),
}));

export const followsRelations = relations(follows, ({ one }) => ({
    follower: one(users, { fields: [follows.follower_id], references: [users.id] }),
    following: one(users, { fields: [follows.following_id], references: [users.id] }),
}));

export const draftsRelations = relations(drafts, ({ one, many }) => ({
    author: one(users, { fields: [drafts.user_id], references: [users.id] }),
    images: many(draftImages),
    tags: many(draftTags),
}));
