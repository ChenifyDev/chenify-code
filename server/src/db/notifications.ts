import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { comments, notifications, posts, users } from "./schema";
import type { UserSummary } from "./types";

export type NotificationType = "post_comment" | "post_reply";

export interface AppNotification {
    id: number;
    type: NotificationType;
    actor: UserSummary;
    is_read: boolean;
    created_at: string;
    post_id: number | null;
    work_id: number | null;
    comment_id: number | null;
    snippet: string;
    reply_to: string | null;
    comment: string;
}

export function createNotification(input: {
    userId: number;
    actorId: number;
    type: NotificationType;
    postId?: number | null;
    commentId?: number | null;
}): void {
    db.insert(notifications)
        .values({
            user_id: input.userId,
            actor_id: input.actorId,
            type: input.type,
            post_id: input.postId ?? null,
            work_id: null,
            comment_id: input.commentId ?? null,
        })
        .run();
}

export function countUnreadNotifications(userId: number): number {
    const row = db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
        .get();
    return row?.n ?? 0;
}

export function markNotificationsRead(userId: number, ids?: number[]): void {
    if (ids && ids.length > 0) {
        db.update(notifications)
            .set({ is_read: true })
            .where(and(eq(notifications.user_id, userId), inArray(notifications.id, ids)))
            .run();
    } else {
        db.update(notifications).set({ is_read: true }).where(eq(notifications.user_id, userId)).run();
    }
}

export function listNotifications(userId: number, options: { offset: number; limit: number }): AppNotification[] {
    const rows = db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, userId))
        .orderBy(desc(notifications.created_at), desc(notifications.id))
        .limit(options.limit)
        .offset(options.offset)
        .all();

    const actorIds = [...new Set(rows.map((r) => r.actor_id))];
    const actors = new Map<number, UserSummary>();
    if (actorIds.length > 0) {
        const userRows = db
            .select({ id: users.id, username: users.username, avatar: users.avatar, created_at: users.created_at })
            .from(users)
            .where(inArray(users.id, actorIds))
            .all();
        for (const row of userRows) actors.set(row.id, row);
    }

    const postIds = [...new Set(rows.filter((r) => r.post_id != null).map((r) => r.post_id as number))];
    const postSnippets = new Map<number, string>();
    if (postIds.length > 0) {
        const postRows = db
            .select({ id: posts.id, snippet: sql<string>`substr(${posts.content}, 1, 200)` })
            .from(posts)
            .where(inArray(posts.id, postIds))
            .all();
        for (const row of postRows) postSnippets.set(row.id, row.snippet);
    }

    const replyTo = new Map<number, string>();
    const postReplyIds = rows.filter((r) => r.type === "post_reply").map((r) => r.comment_id as number);
    if (postReplyIds.length > 0) {
        const news = db
            .select({ id: comments.id, parent_id: comments.parent_id })
            .from(comments)
            .where(inArray(comments.id, postReplyIds))
            .all();
        const parentIds = [...new Set(news.map((n) => n.parent_id).filter((p): p is number => p != null))];
        if (parentIds.length > 0) {
            const parents = db
                .select({ id: comments.id, content: comments.content })
                .from(comments)
                .where(inArray(comments.id, parentIds))
                .all();
            const parentMap = new Map(parents.map((p) => [p.id, p.content]));
            for (const n of news) {
                if (n.parent_id != null) replyTo.set(n.id, parentMap.get(n.parent_id) ?? "");
            }
        }
    }

    const postCommentIds = rows
        .filter((r) => r.type === "post_comment" || r.type === "post_reply")
        .map((r) => r.comment_id)
        .filter((id): id is number => id != null);
    const commentContents = new Map<number, string>();
    if (postCommentIds.length > 0) {
        const news = db
            .select({ id: comments.id, content: comments.content })
            .from(comments)
            .where(inArray(comments.id, postCommentIds))
            .all();
        for (const n of news) commentContents.set(n.id, n.content);
    }

    return rows.map((row) => {
        const replyCommentId = row.comment_id ?? 0;
        return {
            id: row.id,
            type: row.type,
            actor: actors.get(row.actor_id) ?? { id: row.actor_id, username: "未知用户", avatar: null, created_at: "" },
            is_read: row.is_read,
            created_at: row.created_at,
            post_id: row.post_id,
            work_id: null,
            comment_id: row.comment_id,
            snippet: row.post_id != null ? (postSnippets.get(row.post_id) ?? "") : "",
            reply_to: replyTo.get(replyCommentId) ?? null,
            comment: row.comment_id != null ? (commentContents.get(row.comment_id) ?? "") : "",
        };
    });
}

export function deleteNotificationsForPost(postId: number): void {
    db.delete(notifications).where(eq(notifications.post_id, postId)).run();
}

export function deleteNotificationsForComment(commentIds: number[]): void {
    if (commentIds.length === 0) return;
    db.delete(notifications).where(inArray(notifications.comment_id, commentIds)).run();
}
