import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { favorites, follows, likes, postImages, postTags, tags } from "./schema";
import type { Comment, CommentRow, Post, PostRow, UserSummary } from "./types";

function fetchPostImages(ids: number[]): Map<number, string[]> {
    const map = new Map<number, string[]>();
    if (ids.length === 0) return map;
    const rows = db
        .select({ post_id: postImages.post_id, path: postImages.path })
        .from(postImages)
        .where(inArray(postImages.post_id, ids))
        .all();
    for (const row of rows) {
        const arr = map.get(row.post_id) ?? [];
        arr.push(row.path);
        map.set(row.post_id, arr);
    }
    return map;
}

function fetchPostTags(ids: number[]): Map<number, string[]> {
    const map = new Map<number, string[]>();
    if (ids.length === 0) return map;
    const rows = db
        .select({ post_id: postTags.post_id, name: tags.name })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tag_id))
        .where(inArray(postTags.post_id, ids))
        .all();
    for (const row of rows) {
        const arr = map.get(row.post_id) ?? [];
        arr.push(row.name);
        map.set(row.post_id, arr);
    }
    return map;
}

function fetchPostFavorites(viewerId: number, ids: number[]): Set<number> {
    const set = new Set<number>();
    if (ids.length === 0) return set;
    const rows = db
        .select({ post_id: favorites.post_id })
        .from(favorites)
        .where(and(eq(favorites.user_id, viewerId), inArray(favorites.post_id, ids)))
        .all();
    for (const row of rows) set.add(row.post_id);
    return set;
}

function fetchPostLikes(viewer: number, ids: number[]): Set<number> {
    const set = new Set<number>();
    if (ids.length === 0) return set;
    const rows = db
        .select({ post_id: likes.post_id })
        .from(likes)
        .where(and(eq(likes.user_id, viewer), inArray(likes.post_id, ids)))
        .all();
    for (const row of rows) set.add(row.post_id);
    return set;
}

function fetchFollowedAuthors(viewer: number, authorIds: number[]): Set<number> {
    const set = new Set<number>();
    if (authorIds.length === 0) return set;
    const rows = db
        .select({ following_id: follows.following_id })
        .from(follows)
        .where(and(eq(follows.follower_id, viewer), inArray(follows.following_id, authorIds)))
        .all();
    for (const row of rows) set.add(row.following_id);
    return set;
}

export function hydratePosts(rows: PostRow[], viewerId: number | null): Post[] {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const images = fetchPostImages(ids);
    const tagMap = fetchPostTags(ids);
    const favIds = viewerId == null ? new Set<number>() : fetchPostFavorites(viewerId, ids);
    const likedIds = viewerId == null ? new Set<number>() : fetchPostLikes(viewerId, ids);
    const followAuthorIds =
        viewerId == null ? new Set<number>() : fetchFollowedAuthors(viewerId, [...new Set(rows.map((r) => r.user_id))]);

    return rows.map((row) => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        author: { id: row.user_id, username: row.username, avatar: row.avatar, created_at: "" } satisfies UserSummary,
        images: images.get(row.id) ?? [],
        tags: tagMap.get(row.id) ?? [],
        comments_count: row.comments_count,
        likes_count: row.likes_count,
        favorites_count: row.favorites_count,
        is_liked: likedIds.has(row.id),
        is_favorited: favIds.has(row.id),
        is_following_author: followAuthorIds.has(row.user_id),
    }));
}

export function toComment(row: CommentRow): Comment {
    return {
        id: row.id,
        post_id: row.post_id,
        parent_id: row.parent_id,
        content: row.content,
        created_at: row.created_at,
        author: { id: row.user_id, username: row.username, avatar: row.avatar, created_at: "" } satisfies UserSummary,
        post_snippet: row.post_snippet,
        likes_count: 0,
        is_liked: false,
        replies: [],
    };
}