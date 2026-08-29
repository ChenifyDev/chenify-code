import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredComment, StoredNotification, StoredPost, StoredUser } from "../rows";
import { buildNotifications, snippet } from "../mappers";
import type { AppNotification, UserSummary } from "../types";
import type { NotificationsRepo } from "../plugin";

export async function insertNotificationRow(
    store: CollectionStore,
    input: {
        userId: number;
        actorId: number;
        type: "post_comment" | "post_reply";
        postId?: number | null;
        commentId?: number | null;
    },
): Promise<void> {
    await store.insert<StoredNotification>(C.notifications, {
        user_id: input.userId,
        actor_id: input.actorId,
        type: input.type,
        post_id: input.postId ?? null,
        work_id: null,
        comment_id: input.commentId ?? null,
        is_read: false,
        created_at: new Date().toISOString(),
    });
}

export async function countUnreadRows(store: CollectionStore, userId: number): Promise<number> {
    const rows = await store.read<StoredNotification>(C.notifications);
    return rows.filter((row) => row.user_id === userId && !row.is_read).length;
}

export async function markReadRows(store: CollectionStore, userId: number, ids?: number[]): Promise<void> {
    const rows = await store.read<StoredNotification>(C.notifications);
    let changed = false;
    for (const row of rows) {
        if (row.user_id !== userId) continue;
        if (ids && ids.length > 0 && !ids.includes(row.id)) continue;
        if (!row.is_read) {
            row.is_read = true;
            changed = true;
        }
    }
    if (changed) await store.write(C.notifications, rows);
}

export async function listNotificationRows(
    store: CollectionStore,
    userId: number,
    options: { offset: number; limit: number },
): Promise<AppNotification[]> {
    const [rows, users, posts, comments] = await Promise.all([
        store.read<StoredNotification>(C.notifications),
        store.read<StoredUser>(C.users),
        store.read<StoredPost>(C.posts),
        store.read<StoredComment>(C.comments),
    ]);

    const ordered = rows
        .filter((row) => row.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .slice(options.offset, options.offset + options.limit);

    const actors = new Map<number, UserSummary>();
    for (const user of users)
        actors.set(user.id, { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at });

    const postSnippets = new Map<number, string>();
    for (const post of posts) postSnippets.set(post.id, snippet(post.content));

    const commentMap = new Map(comments.map((c) => [c.id, c]));
    const replyTo = new Map<number, string>();
    const commentContents = new Map<number, string>();
    for (const row of ordered) {
        if (row.comment_id == null) continue;
        const comment = commentMap.get(row.comment_id);
        if (!comment) continue;
        commentContents.set(comment.id, comment.content);
        if (row.type === "post_reply" && comment.parent_id != null) {
            const parent = commentMap.get(comment.parent_id);
            replyTo.set(comment.id, parent?.content ?? "");
        }
    }

    return buildNotifications(ordered, { actors, postSnippets, replyTo, commentContents });
}

export async function countNotificationRows(store: CollectionStore, userId: number): Promise<number> {
    const rows = await store.read<StoredNotification>(C.notifications);
    return rows.filter((row) => row.user_id === userId).length;
}

export async function deleteNotificationsForPost(store: CollectionStore, postId: number): Promise<void> {
    await store.deleteWhere<StoredNotification>(C.notifications, (row) => row.post_id === postId);
}

export async function deleteNotificationsForComment(store: CollectionStore, commentIds: number[]): Promise<void> {
    if (commentIds.length === 0) return;
    await store.deleteWhere<StoredNotification>(
        C.notifications,
        (row) => row.comment_id != null && commentIds.includes(row.comment_id),
    );
}

export function createNotificationsRepo(store: CollectionStore): NotificationsRepo {
    return {
        async createNotification(input) {
            await insertNotificationRow(store, input);
        },
        async countNotifications(userId) {
            return countNotificationRows(store, userId);
        },
        async countUnreadNotifications(userId) {
            return countUnreadRows(store, userId);
        },
        async markNotificationsRead(userId, ids) {
            await markReadRows(store, userId, ids);
        },
        async listNotifications(userId, options) {
            return listNotificationRows(store, userId, options);
        },
        async deleteNotificationsForPost(postId) {
            await deleteNotificationsForPost(store, postId);
        },
        async deleteNotificationsForComment(commentIds) {
            await deleteNotificationsForComment(store, commentIds);
        },
    };
}
