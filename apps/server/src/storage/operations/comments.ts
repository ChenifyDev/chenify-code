import { C } from "../collections";
import { deleteContentBlob, loadContentBlob, saveContentBlob } from "../content";
import type { BlobStore, CollectionStore } from "../store";
import type { StoredComment, StoredCommentLike, StoredPost, StoredUser } from "../rows";
import { deleteNotificationsForComment } from "./notifications";
import { buildCommentTree, snippet, toCommentNode, type CommentNode } from "../mappers";
import type { UserSummary } from "../types";
import type { CommentsRepo } from "../plugin";

export async function deleteComments(store: CollectionStore, blobStore: BlobStore, ids: number[]) {
    if (ids.length === 0) return;
    await Promise.all([
        store.deleteWhere<StoredCommentLike>(C.commentLikes, (row) => ids.includes(row.comment_id)),
        deleteNotificationsForComment(store, ids),
    ]);
    await deleteCommentRowsLeafFirst(store, blobStore, ids);
}

async function deleteCommentRowsLeafFirst(store: CollectionStore, blobStore: BlobStore, ids: number[]) {
    const rows = await store.read<StoredComment>(C.comments);
    for (const row of rows.filter((r) => ids.includes(r.id))) {
        await deleteContentBlob(blobStore, row.content);
    }
    const remaining = new Set(ids);
    while (remaining.size > 0) {
        const allRows = await store.read<StoredComment>(C.comments);
        const parents = new Set(
            allRows.filter((row) => remaining.has(row.parent_id ?? -1)).map((row) => row.parent_id),
        );
        const leaves = [...remaining].filter((id) => !parents.has(id));
        if (leaves.length === 0) break;
        await Promise.all(leaves.map((id) => store.removeById(C.comments, id)));
        for (const id of leaves) remaining.delete(id);
    }
    await store.deleteWhere<StoredComment>(C.comments, (row) => ids.includes(row.id));
}

export function createCommentsRepo(store: CollectionStore, blobStore: BlobStore): CommentsRepo {
    return {
        async createComment(userId, postId, content, parentId) {
            const contentRef = await saveContentBlob(blobStore, content);
            const created = await store.insert<StoredComment>(C.comments, {
                post_id: postId,
                user_id: userId,
                content: contentRef,
                parent_id: parentId ?? null,
                created_at: new Date().toISOString(),
            });
            const [users, posts] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredPost>(C.posts),
            ]);
            const author = users.find((user) => user.id === userId);
            const post = posts.find((p) => p.id === postId);
            const node: CommentNode = {
                id: created.id,
                post_id: postId,
                parent_id: created.parent_id,
                content: await loadContentBlob(blobStore, created.content),
                created_at: created.created_at,
                user_id: userId,
                username: author?.username ?? "未知用户",
                avatar: author?.avatar ?? null,
                post_snippet: post ? snippet(await loadContentBlob(blobStore, post.content)) : "",
                author: author
                    ? { id: author.id, username: author.username, avatar: author.avatar, created_at: author.created_at }
                    : { id: userId, username: "未知用户", avatar: null, created_at: "" },
                likes_count: 0,
                is_liked: false,
            };
            return toCommentNode(node);
        },

        async listComments(postId, viewerId, options) {
            const [comments, users, commentLikes, posts] = await Promise.all([
                store.read<StoredComment>(C.comments),
                store.read<StoredUser>(C.users),
                store.read<StoredCommentLike>(C.commentLikes),
                store.read<StoredPost>(C.posts),
            ]);

            const commentsOfPost = comments
                .filter((row) => row.post_id === postId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

            const userMap = new Map(users.map((user) => [user.id, user]));
            const post = posts.find((p) => p.id === postId);

            const likeCounts = new Map<number, number>();
            for (const like of commentLikes) {
                if (!commentsOfPost.some((c) => c.id === like.comment_id)) continue;
                likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);
            }

            const likedIds = new Set<number>();
            if (viewerId != null) {
                for (const like of commentLikes)
                    if (like.user_id === viewerId && commentsOfPost.some((c) => c.id === like.comment_id))
                        likedIds.add(like.comment_id);
            }

            const base: CommentNode[] = await Promise.all(
                commentsOfPost.map(async (row) => {
                    const author = userMap.get(row.user_id);
                    const authorInfo: UserSummary = author
                        ? {
                              id: author.id,
                              username: author.username,
                              avatar: author.avatar,
                              created_at: author.created_at,
                          }
                        : { id: row.user_id, username: "未知用户", avatar: null, created_at: "" };
                    return {
                        id: row.id,
                        post_id: row.post_id,
                        parent_id: row.parent_id,
                        content: await loadContentBlob(blobStore, row.content),
                        created_at: row.created_at,
                        user_id: row.user_id,
                        username: author?.username ?? "未知用户",
                        avatar: author?.avatar ?? null,
                        post_snippet: post ? snippet(await loadContentBlob(blobStore, post.content)) : "",
                        author: authorInfo,
                        likes_count: likeCounts.get(row.id) ?? 0,
                        is_liked: likedIds.has(row.id),
                    };
                }),
            );

            return buildCommentTree(base, options);
        },

        async getCommentOwner(id) {
            const comment = await store.getById<StoredComment>(C.comments, id);
            return comment?.user_id ?? null;
        },

        async commentBelongsToPost(commentId, postId) {
            const comment = await store.getById<StoredComment>(C.comments, commentId);
            return comment != null && comment.post_id === postId;
        },

        async toggleCommentLike(userId, commentId) {
            const rows = await store.read<StoredCommentLike>(C.commentLikes);
            const existing = rows.find((row) => row.user_id === userId && row.comment_id === commentId);
            if (existing) {
                await store.deleteWhere<StoredCommentLike>(
                    C.commentLikes,
                    (row) => row.user_id === userId && row.comment_id === commentId,
                );
                return { liked: false, likes_count: rows.filter((row) => row.comment_id === commentId).length - 1 };
            }
            await store.insert<StoredCommentLike>(C.commentLikes, {
                user_id: userId,
                comment_id: commentId,
                created_at: new Date().toISOString(),
            });
            return { liked: true, likes_count: rows.filter((row) => row.comment_id === commentId).length + 1 };
        },

        async unlikeComment(userId, commentId) {
            const rows = await store.read<StoredCommentLike>(C.commentLikes);
            await store.deleteWhere<StoredCommentLike>(
                C.commentLikes,
                (row) => row.user_id === userId && row.comment_id === commentId,
            );
            return { liked: false, likes_count: rows.filter((row) => row.comment_id === commentId).length - 1 };
        },

        async deleteComment(id) {
            const existed = await store.getById<StoredComment>(C.comments, id);
            if (!existed) return false;
            const comments = await store.read<StoredComment>(C.comments);
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
            await deleteComments(store, blobStore, descendantIds);
            return true;
        },
    };
}
