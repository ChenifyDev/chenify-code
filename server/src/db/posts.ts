import { desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { comments, favorites, likes, postImages, postTags, posts, tags, users } from "./schema";
import { getOrCreateTag } from "./tags";
import { hydratePosts } from "./helpers";
import type { Post, PostRow } from "./types";

const countComments = sql<number>`(select count(*) from ${comments} c where c.post_id = ${posts.id})`;
const countLikes = sql<number>`(select count(*) from ${likes} l where l.post_id = ${posts.id})`;
const countFavorites = sql<number>`(select count(*) from ${favorites} f where f.post_id = ${posts.id})`;

const postSelect = {
    id: posts.id,
    user_id: posts.user_id,
    content: posts.content,
    created_at: posts.created_at,
    username: users.username,
    avatar: users.avatar,
    comments_count: countComments,
    likes_count: countLikes,
    favorites_count: countFavorites,
} as const;

function postBoard(where?: SQL) {
    const q = db.select(postSelect).from(posts).innerJoin(users, eq(users.id, posts.user_id));
    return where ? q.where(where) : q;
}

export function getPostOwner(id: number): number | null {
    const row = db
        .select({ user_id: posts.user_id })
        .from(posts)
        .where(eq(posts.id, id))
        .get();
    return row?.user_id ?? null;
}

export function createPost(
    userId: number,
    content: string,
    imagePaths: string[],
    postTagsNames: string[],
): Post | null {
    const post = db.insert(posts).values({ user_id: userId, content }).returning().get();
    for (const path of imagePaths) db.insert(postImages).values({ post_id: post.id, path }).run();
    for (const tag of postTagsNames) {
        const tagId = getOrCreateTag(tag);
        if (tagId != null) db.insert(postTags).values({ post_id: post.id, tag_id: tagId }).onConflictDoNothing().run();
    }
    return getPostById(post.id, userId);
}

export function getPostById(id: number, viewerId: number | null): Post | null {
    const row = postBoard(eq(posts.id, id)).get() as PostRow | undefined;
    if (!row) return null;
    return hydratePosts([row], viewerId)[0]!;
}

export function listPosts(options: {
    offset: number;
    limit: number;
    tag?: string | null;
    sort?: "latest" | "hot";
    viewerId: number | null;
}): Post[] {
    const { limit, offset, tag, viewerId } = options;

    if (options.sort === "hot") {
        const tagFilter =
            tag != null
                ? sql`WHERE p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ${tag})`
                : sql``;
        const rows =
            db.all(sql`
            SELECT *, ((likes_count * 3 + favorites_count * 4 + comments_count * 2 + 1)
                / pow((julianday('now') - julianday(created_at)) * 24 + 2, 1.5)) AS heat
            FROM (
                SELECT p.id, p.user_id, p.content, p.created_at, u.username, u.avatar,
                    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
                    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
                    (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
                FROM posts p JOIN users u ON u.id = p.user_id
                ${tagFilter}
            )
            ORDER BY heat DESC, created_at DESC, id DESC
            LIMIT ${limit} OFFSET ${offset}`) as unknown as PostRow[];
        return hydratePosts(rows, viewerId);
    }

    const tagPostIds = tag
        ? db
              .select({ post_id: postTags.post_id })
              .from(postTags)
              .innerJoin(tags, eq(tags.id, postTags.tag_id))
              .where(eq(tags.name, tag))
        : undefined;

    const rows = postBoard(tag ? inArray(posts.id, tagPostIds!) : undefined)
        .orderBy(desc(posts.created_at), desc(posts.id))
        .limit(limit)
        .offset(offset)
        .all() as PostRow[];
    return hydratePosts(rows, viewerId);
}

export function listUserPosts(
    userId: number,
    options: { offset: number; limit: number; viewerId: number | null },
): Post[] {
    const rows = postBoard(eq(posts.user_id, userId))
        .orderBy(desc(posts.created_at), desc(posts.id))
        .limit(options.limit)
        .offset(options.offset)
        .all() as PostRow[];
    return hydratePosts(rows, options.viewerId);
}

export function listUserFavorites(
    userId: number,
    options: { offset: number; limit: number; viewerId: number | null },
): Post[] {
    const rows = db
        .select(postSelect)
        .from(favorites)
        .innerJoin(posts, eq(posts.id, favorites.post_id))
        .innerJoin(users, eq(users.id, posts.user_id))
        .where(eq(favorites.user_id, userId))
        .orderBy(desc(favorites.id))
        .limit(options.limit)
        .offset(options.offset)
        .all() as PostRow[];
    return hydratePosts(rows, options.viewerId);
}

function deletePostRowsOnly(id: number): void {
    db.delete(postImages).where(eq(postImages.post_id, id)).run();
    db.delete(postTags).where(eq(postTags.post_id, id)).run();
    db.delete(favorites).where(eq(favorites.post_id, id)).run();
    db.delete(comments).where(eq(comments.post_id, id)).run();
    db.delete(posts).where(eq(posts.id, id)).run();
}

export function deletePost(id: number): string[] {
    const images = db
        .select({ path: postImages.path })
        .from(postImages)
        .where(eq(postImages.post_id, id))
        .all()
        .map((row) => row.path);
    deletePostRowsOnly(id);
    return images;
}

export function deletePostRow(id: number): void {
    deletePostRowsOnly(id);
}