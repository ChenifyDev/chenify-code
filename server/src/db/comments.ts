import { desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { comments, posts, users } from "./schema";
import { toComment } from "./helpers";
import type { Comment, CommentRow } from "./types";

const commentSelect = {
    id: comments.id,
    post_id: comments.post_id,
    content: comments.content,
    created_at: comments.created_at,
    user_id: comments.user_id,
    username: users.username,
    avatar: users.avatar,
    post_snippet: sql<string>`(select substr(p.content, 1, 200) from ${posts} p where p.id = ${comments.post_id})`,
} as const;

export function createComment(userId: number, postId: number, content: string): Comment | null {
    const result = db.insert(comments).values({ post_id: postId, user_id: userId, content }).returning().get();
    const row = db
        .select(commentSelect)
        .from(comments)
        .innerJoin(users, eq(users.id, comments.user_id))
        .where(eq(comments.id, result.id))
        .get();
    return row ? toComment(row as CommentRow) : null;
}

export function listComments(postId: number, options: { offset: number; limit: number }): Comment[] {
    const rows = db
        .select(commentSelect)
        .from(comments)
        .innerJoin(users, eq(users.id, comments.user_id))
        .where(eq(comments.post_id, postId))
        .orderBy(desc(comments.created_at), desc(comments.id))
        .limit(options.limit)
        .offset(options.offset)
        .all();
    return rows.map((row) => toComment(row as CommentRow));
}

export function getCommentOwner(id: number): number | null {
    const row = db
        .select({ user_id: comments.user_id })
        .from(comments)
        .where(eq(comments.id, id))
        .get();
    return row?.user_id ?? null;
}

export function deleteComment(id: number): boolean {
    const existed = db
        .select({ one: sql`1` })
        .from(comments)
        .where(eq(comments.id, id))
        .get();
    db.delete(comments).where(eq(comments.id, id)).run();
    return existed != null;
}