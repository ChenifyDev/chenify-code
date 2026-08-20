import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredWorkComment, StoredWorkCommentLike } from "../rows";
import { authorOf, fetchAuthors } from "./works-helpers";
import { buildWorkCommentTree, type WorkCommentNode } from "../mappers";
import type { WorkComment } from "../types";
import type { WorksCommentsRepo } from "../plugin";

export function createWorksCommentsRepo(store: CollectionStore): WorksCommentsRepo {
    return {
        async createWorkComment(userId, workId, content, parentId) {
            const created = await store.insert<StoredWorkComment>(C.worksComments, {
                work_id: workId,
                user_id: userId,
                content,
                parent_id: parentId ?? null,
                created_at: new Date().toISOString(),
            });
            return {
                id: created.id,
                work_id: workId,
                parent_id: created.parent_id,
                content: created.content,
                created_at: created.created_at,
                author: await authorOf(store, userId),
                likes_count: 0,
                is_liked: false,
                replies: [],
            } satisfies WorkComment;
        },

        async listWorkComments(workId, viewerId, options) {
            const [comments, commentLikes] = await Promise.all([
                store.read<StoredWorkComment>(C.worksComments),
                store.read<StoredWorkCommentLike>(C.worksCommentLikes),
            ]);

            const commentsOfWork = comments
                .filter((row) => row.work_id === workId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

            const likeCounts = new Map<number, number>();
            const likedIds = new Set<number>();
            for (const like of commentLikes) {
                if (!commentsOfWork.some((c) => c.id === like.comment_id)) continue;
                likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);
                if (viewerId != null && like.user_id === viewerId) likedIds.add(like.comment_id);
            }

            const authors = await fetchAuthors(store, [...new Set(commentsOfWork.map((row) => row.user_id))]);

            const base: WorkCommentNode[] = commentsOfWork.map((row) => ({
                ...row,
                author: authors.get(row.user_id) ?? {
                    id: row.user_id,
                    username: "未知用户",
                    avatar: null,
                    created_at: "",
                },
                likes_count: likeCounts.get(row.id) ?? 0,
                is_liked: likedIds.has(row.id),
            }));

            return buildWorkCommentTree(base, options);
        },

        async getWorkCommentOwner(id) {
            const comment = await store.getById<StoredWorkComment>(C.worksComments, id);
            return comment?.user_id ?? null;
        },

        async workCommentBelongsToWork(commentId, workId) {
            const comment = await store.getById<StoredWorkComment>(C.worksComments, commentId);
            return comment != null && comment.work_id === workId;
        },

        async toggleWorkCommentLike(userId, commentId) {
            const rows = await store.read<StoredWorkCommentLike>(C.worksCommentLikes);
            const existing = rows.find((row) => row.user_id === userId && row.comment_id === commentId);
            if (existing) {
                await store.deleteWhere<StoredWorkCommentLike>(
                    C.worksCommentLikes,
                    (row) => row.user_id === userId && row.comment_id === commentId,
                );
                return { liked: false, likes_count: rows.filter((row) => row.comment_id === commentId).length - 1 };
            }
            await store.insert<StoredWorkCommentLike>(C.worksCommentLikes, {
                user_id: userId,
                comment_id: commentId,
                created_at: new Date().toISOString(),
            });
            return { liked: true, likes_count: rows.filter((row) => row.comment_id === commentId).length + 1 };
        },

        async unlikeWorkComment(userId, commentId) {
            const rows = await store.read<StoredWorkCommentLike>(C.worksCommentLikes);
            await store.deleteWhere<StoredWorkCommentLike>(
                C.worksCommentLikes,
                (row) => row.user_id === userId && row.comment_id === commentId,
            );
            return { liked: false, likes_count: rows.filter((row) => row.comment_id === commentId).length - 1 };
        },

        async deleteWorkComment(id) {
            const existed = await store.getById<StoredWorkComment>(C.worksComments, id);
            if (!existed) return false;
            const comments = await store.read<StoredWorkComment>(C.worksComments);
            const descendantIds = [id];
            const queue = [id];
            while (queue.length > 0) {
                const pid = queue.shift()!;
                for (const row of comments) {
                    if (row.parent_id === pid) {
                        descendantIds.push(row.id);
                        queue.push(row.id);
                    }
                }
            }
            await Promise.all([
                store.deleteWhere<StoredWorkCommentLike>(C.worksCommentLikes, (row) =>
                    descendantIds.includes(row.comment_id),
                ),
                store.deleteWhere<StoredWorkComment>(C.worksComments, (row) => descendantIds.includes(row.id)),
            ]);
            return true;
        },
    };
}
