import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { commentLikes, comments } from "./schema";
import { authorOf, fetchAuthors } from "./helpers";
import type { UserSummary } from "../db/types";
import type { WorkComment, WorkCommentFlat } from "./types";

export function createWorkComment(
    userId: number,
    workId: number,
    content: string,
    parentId?: number | null,
): WorkComment | null {
    const insertValues = parentId
        ? { work_id: workId, user_id: userId, content, parent_id: parentId }
        : { work_id: workId, user_id: userId, content };
    const result = db.insert(comments).values(insertValues).returning().get();
    return {
        id: result.id,
        work_id: workId,
        parent_id: result.parent_id ?? null,
        content: result.content,
        created_at: result.created_at,
        author: authorOf(userId),
        likes_count: 0,
        is_liked: false,
        replies: [],
    };
}

function countWorkCommentLikes(commentIds: number[]): Map<number, number> {
    const map = new Map<number, number>();
    if (commentIds.length === 0) return map;
    const rows = db
        .select({ comment_id: commentLikes.comment_id, n: count() })
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

export function listWorkComments(
    workId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): WorkComment[] {
    const rows = db
        .select({
            id: comments.id,
            work_id: comments.work_id,
            parent_id: comments.parent_id,
            user_id: comments.user_id,
            content: comments.content,
            created_at: comments.created_at,
        })
        .from(comments)
        .where(eq(comments.work_id, workId))
        .orderBy(desc(comments.created_at), desc(comments.id))
        .all() as unknown as WorkCommentFlat[];

    const authors = fetchAuthors([...new Set(rows.map((r) => r.user_id))]);
    const likeCounts = countWorkCommentLikes(rows.map((r) => r.id));
    const likedIds = fetchLikedComments(
        viewerId,
        rows.map((r) => r.id),
    );

    type FlatWithAuthor = WorkCommentFlat & { author: UserSummary };
    const base: FlatWithAuthor[] = rows.map((row) => ({
        ...row,
        author: authors.get(row.user_id) ?? { id: row.user_id, username: "未知用户", avatar: null, created_at: "" },
    }));

    // 顶层评论按创建时间倒序；每条顶层评论的回复（含所有后代）按时间正序平铺
    const roots = base.filter((c) => c.parent_id == null);
    const childrenMap = new Map<number, FlatWithAuthor[]>();
    for (const c of base) {
        if (c.parent_id == null) continue;
        const arr = childrenMap.get(c.parent_id) ?? [];
        arr.push(c);
        childrenMap.set(c.parent_id, arr);
    }
    const descendants = new Map<number, FlatWithAuthor[]>();
    const collect = (rootId: number): FlatWithAuthor[] => {
        if (descendants.has(rootId)) return descendants.get(rootId)!;
        const out: FlatWithAuthor[] = [];
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

    const toNode = (flat: FlatWithAuthor): WorkComment => ({
        id: flat.id,
        work_id: flat.work_id,
        parent_id: flat.parent_id,
        content: flat.content,
        created_at: flat.created_at,
        author: flat.author,
        likes_count: likeCounts.get(flat.id) ?? 0,
        is_liked: likedIds.has(flat.id),
        replies: [],
    });

    // 分页仅作用于顶层评论
    const pagedRoots = roots.slice(options.offset, options.offset + options.limit);
    return pagedRoots.map((root) => ({
        ...toNode(root),
        replies: collect(root.id).map(toNode),
    }));
}

export function getWorkCommentOwner(id: number): number | null {
    const row = db.select({ user_id: comments.user_id }).from(comments).where(eq(comments.id, id)).get();
    return row?.user_id ?? null;
}

export function workCommentBelongsToWork(commentId: number, workId: number): boolean {
    const row = db.select({ work_id: comments.work_id }).from(comments).where(eq(comments.id, commentId)).get();
    return row != null && row.work_id === workId;
}

function countCommentLikesFor(commentId: number): number {
    return db.select({ n: count() }).from(commentLikes).where(eq(commentLikes.comment_id, commentId)).get()!.n;
}

export function toggleWorkCommentLike(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: commentLikes.id })
        .from(commentLikes)
        .where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId)))
        .get();
    if (existing) {
        db.delete(commentLikes)
            .where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId)))
            .run();
        return { liked: false, likes_count: countCommentLikesFor(commentId) };
    }
    db.insert(commentLikes).values({ user_id: userId, comment_id: commentId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countCommentLikesFor(commentId) };
}

export function unlikeWorkComment(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    db.delete(commentLikes)
        .where(and(eq(commentLikes.user_id, userId), eq(commentLikes.comment_id, commentId)))
        .run();
    return { liked: false, likes_count: countCommentLikesFor(commentId) };
}

export function deleteWorkComment(id: number): boolean {
    const existed = db.select({ id: comments.id }).from(comments).where(eq(comments.id, id)).get();
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
