import { relations, sql } from "drizzle-orm";
import {
    index,
    integer,
    primaryKey,
    real,
    sqliteTable,
    text,
    uniqueIndex,
    type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const now = sql.raw("(datetime('now'))");

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    avatar: text("avatar"),
    created_at: text("created_at").notNull().default(now),
    is_favorites_public: integer("is_favorites_public", { mode: "boolean" }).notNull().default(sql.raw("1")),
    is_follows_public: integer("is_follows_public", { mode: "boolean" }).notNull().default(sql.raw("1")),
});

export const posts = sqliteTable(
    "posts",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
        pinned: integer("pinned", { mode: "boolean" }).notNull().default(sql.raw("0")),
    },
    (table) => [index("idx_posts_user_id").on(table.user_id), index("idx_posts_created_at").on(table.created_at)],
);

export const postImages = sqliteTable(
    "post_images",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        path: text("path").notNull(),
    },
    (table) => [index("idx_post_images_post_id").on(table.post_id)],
);

export const tags = sqliteTable("tags", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
});

export const postTags = sqliteTable(
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

export const favorites = sqliteTable(
    "favorites",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
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

export const likes = sqliteTable(
    "likes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
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

export const comments = sqliteTable(
    "comments",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        post_id: integer("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        parent_id: integer("parent_id").references((): AnySQLiteColumn => comments.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_comments_post_id").on(table.post_id),
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

export const follows = sqliteTable(
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

export const notifications = sqliteTable(
    "notifications",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
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
        is_read: integer("is_read", { mode: "boolean" }).notNull().default(sql.raw("0")),
        created_at: text("created_at").notNull().default(now),
    },
    (table) => [
        index("idx_notifications_user").on(table.user_id),
        index("idx_notifications_user_read").on(table.user_id, table.is_read),
    ],
);

export const coinTransactions = sqliteTable(
    "coin_transactions",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        post_id: integer("post_id").references(() => posts.id, { onDelete: "set null" }),
        to_user_id: integer("to_user_id").references(() => users.id),
        type: text("type", { enum: ["daily", "tip_out", "tip_in"] }).notNull(),
        amount: real("amount").notNull(),
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

export const drafts = sqliteTable(
    "drafts",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
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

export const draftImages = sqliteTable(
    "draft_images",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        draft_id: integer("draft_id")
            .notNull()
            .references(() => drafts.id, { onDelete: "cascade" }),
        path: text("path").notNull(),
    },
    (table) => [index("idx_draft_images_draft_id").on(table.draft_id)],
);

export const draftTags = sqliteTable(
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

// --- OAuth2 ---

export const oauthClients = sqliteTable("oauth_clients", {
    id: text("id").primaryKey(),
    secret: text("secret"),
    name: text("name").notNull(),
    redirect_uris: text("redirect_uris").notNull(),
    scopes: text("scopes").notNull().default("openid profile email"),
    created_at: text("created_at").notNull().default(now),
});

export const oauthAuthCodes = sqliteTable(
    "oauth_auth_codes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        code: text("code").notNull().unique(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        client_id: text("client_id")
            .notNull()
            .references(() => oauthClients.id),
        redirect_uri: text("redirect_uri").notNull(),
        code_challenge: text("code_challenge").notNull(),
        scope: text("scope").notNull().default(""),
        expires_at: text("expires_at").notNull(),
        used: integer("used", { mode: "boolean" }).notNull().default(false),
    },
    (table) => [
        index("idx_oauth_auth_codes_code").on(table.code),
        index("idx_oauth_auth_codes_client").on(table.client_id),
    ],
);

export const oauthRefreshTokens = sqliteTable(
    "oauth_refresh_tokens",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        token_hash: text("token_hash").notNull().unique(),
        user_id: integer("user_id")
            .notNull()
            .references(() => users.id),
        client_id: text("client_id")
            .notNull()
            .references(() => oauthClients.id),
        scope: text("scope").notNull().default(""),
        expires_at: text("expires_at").notNull(),
        revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
    },
    (table) => [
        index("idx_oauth_refresh_tokens_hash").on(table.token_hash),
        index("idx_oauth_refresh_tokens_user").on(table.user_id),
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

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PostRowRaw = typeof posts.$inferSelect;
export type CommentRowRaw = typeof comments.$inferSelect;
export type DraftRowRaw = typeof drafts.$inferSelect;
export type FollowRow = typeof follows.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type PostImageRow = typeof postImages.$inferSelect;
export type FavoriteRow = typeof favorites.$inferSelect;
export type CommentLikeRow = typeof commentLikes.$inferSelect;
export type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthAuthCodeRow = typeof oauthAuthCodes.$inferSelect;
export type OAuthRefreshTokenRow = typeof oauthRefreshTokens.$inferSelect;
