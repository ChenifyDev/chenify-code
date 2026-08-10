import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { commentLikes, comments, posts, users } from "./schema";
import { toComment } from "./helpers";
import type { Comment, CommentRow, UserSummary } from "./types";

const commentSelect = {
    id: comments.id,
    post_id: comments.post_id,
    parent_id: comments.parent_id,
    content: comments.content,
    created_at: comments.created_at,
    user_id: comments.user_id,
    username: users.username,
    avatar: users.avatar,
    post_snippet: sql<string>`(select substr(p.content, 1, 200) from ${posts} p where p.id = ${comments.post_id})`,
} as const;

function fetchCommentAuthors(rows: { user_id: number }[]): Map<number, UserSummary> {
    const map = new Map<number, UserSummary>();
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    if (userIds.length === 0) return map;
    const userRows = db
        .select({ id: users.id, username: users.username, avatar: users.avatar, created_at: users.created_at })
        .from(users)
        .where(inArray(users.id, userIds))
        .all();
    for (const row of userRows) map.set(row.id, row);
    return map;
}

function countCommentLikes(commentIds: number[]): Map<number, number> {
    const map = new Map<number, number>();
    if (commentIds.length === 0) return map;
    const rows = db
        .select({ comment_id: commentLikes.comment_id, n: sql<number>`count(*)` })
        .from(commentLikes)
        .where(inArray(commentLikes.comment_id, commentIds))
        .groupBy(commentLikes.comment_id)
        .all();
    for (const row of rows) map.set(row.comment_id, row.n);
    return map;
}

function fetchLikedComments(viewerId: number | null, commentIds: number[]): Set<number> {
    const set = new Set<number>();
    if (viewerId == null || commentIds.length === 0) return set;
    const rows = db
        .select({ comment_id: commentLikes.comment_id })
        .from(commentLikes)
        .where(and(eq(commentLikes.user_id, viewerId), inArray(commentLikes.comment_id, commentIds)))
        .all();
    for (const row of rows) set.add(row.comment_id);
    return set;
}

export function createComment(userId: number, postId: number, content: string, parentId?: number | null): Comment | null {
    const insertValues = parentId ? { post_id: postId, user_id: userId, content, parent_id: parentId } : { post_id: postId, user_id: userId, content };
    const result = db.insert(comments).values(insertValues).returning().get();
    const row = db
        .select(commentSelect)
        .from(comments)
        .innerJoin(users, eq(users.id, comments.user_id))
        .where(eq(comments.id, result.id))
        .get();
    return row ? toComment(row as unknown as CommentRow) : null;
}

export function listComments(
    postId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): Comment[] {
    const rows = db
        .select(commentSelect)
        .from(comments)
        .innerJoin(users, eq(users.id, comments.user_id))
        .where(eq(comments.post_id, postId))
        .orderBy(desc(comments.created_at), desc(comments.id))
        .all() as unknown as CommentRow[];

    const authors = fetchCommentAuthors(rows);
    const likeCounts = countCommentLikes(rows.map((r) => r.id));
    const likedIds = fetchLikedComments(viewerId, rows.map((r) => r.id));

    const base: (CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean })[] = rows.map((row) => ({
        ...row,
        author: authors.get(row.user_id) ?? { id: row.user_id, username: "未知用户", avatar: null, created_at: "" },
        likes_count: likeCounts.get(row.id) ?? 0,
        is_liked: likedIds.has(row.id),
    }));

    // 顶层评论按创建时间倒序；每条顶层评论的回复（含所有后代）按时间正序平铺
    const roots = base.filter((c) => c.parent_id == null);
    const childrenMap = new Map<number, (CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean })[]>();
    for (const c of base) {
        if (c.parent_id == null) continue;
        const arr = childrenMap.get(c.parent_id) ?? [];
        arr.push(c);
        childrenMap.set(c.parent_id, arr);
    }
    const descendants = new Map<number, (CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean })[]>();
    const collect = (rootId: number): (CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean })[] => {
        if (descendants.has(rootId)) return descendants.get(rootId)!;
        const out: (CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean })[] = [];
        const queue = [rootId];
        while (queue.length > 0) {
            const pid = queue.shift()!;
            const kids = childrenMap.get(pid) ?? [];
            for (const k of kids) {
                out.push(k);
                queue.push(k.id);
            }
        }
        out.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
        descendants.set(rootId, out);
        return out;
    };

    const toNode = (flat: CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean }): Comment => ({
        id: flat.id,
        post_id: flat.post_id,
        parent_id: flat.parent_id,
        content: flat.content,
        created_at: flat.created_at,
        author: flat.author,
        post_snippet: flat.post_snippet,
        likes_count: flat.likes_count,
        is_liked: flat.is_liked,
        replies: [],
    });

    // 分页仅作用于顶层评论
    const pagedRoots = roots.slice(options.offset, options.offset + options.limit);
    return pagedRoots.map((root) => ({
        ...toNode(root),
        replies: collect(root.id).map(toNode),
    }));
}

export function getCommentOwner(id: number): number | null {
    const row = db
        .select({ user_id: comments.user_id })
        .from(comments)
        .where(eq(comments.id, id))
        .get();
    return row?.user_id ?? null;
}

export function commentBelongsToPost(commentId: number, postId: number): boolean {
    const row = db
        .select({ post_id: comments.post_id })
        .from(comments)
        .where(eq(comments.id, commentId))
        .get();
    return row != null && row.post_id === postId;
}

function countCommentLikesFor(commentId: number): number {
    return db.select({ n: sql<number>`count(*)` }).from(commentLikes).where(eq(commentLikes.comment_id, commentId)).get()!.n;
}

export function toggleCommentLike(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: commentLikes.id })
        .from(commentLikes)
        .where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId)))
        .get();
    if (existing) {
        db.delete(commentLikes).where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId))).run();
        return { liked: false, likes_count: countCommentLikesFor(commentId) };
    }
    db.insert(commentLikes).values({ user_id: userId, comment_id: commentId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countCommentLikesFor(commentId) };
}

export function unlikeComment(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    db.delete(commentLikes).where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId))).run();
    return { liked: false, likes_count: countCommentLikesFor(commentId) };
}

export function deleteComment(id: number): boolean {
    const existed = db
        .select({ one: sql`1` })
        .from(comments)
        .where(eq(comments.id, id))
        .get();
    // 级联删除所有后代回复及其点赞
    const descendantIds = [id];
    const queue = [id];
    while (queue.length > 0) {
        const pid = queue.shift()!;
        const kids = db.select({ id: comments.id }).from(comments).where(eq(comments.parent_id, pid)).all();
        for (const kid of kids) {
            descendantIds.push(kid.id);
            queue.push(kid.id);
        }
    }
    if (descendantIds.length > 0) {
        db.delete(commentLikes).where(inArray(commentLikes.comment_id, descendantIds)).run();
        db.delete(comments).where(inArray(comments.id, descendantIds)).run();
    }
    return existed != null;
}