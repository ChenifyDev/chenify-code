import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredLike } from "../rows";
import type { LikesRepo } from "../plugin";

export function createLikesRepo(store: CollectionStore): LikesRepo {
    return {
        async toggleLike(userId, postId) {
            const rows = await store.read<StoredLike>(C.likes);
            const existing = rows.find((row) => row.user_id === userId && row.post_id === postId);
            if (existing) {
                await store.deleteWhere<StoredLike>(C.likes, (row) => row.user_id === userId && row.post_id === postId);
                return { liked: false, likes_count: rows.filter((row) => row.post_id === postId).length - 1 };
            }
            await store.insert<StoredLike>(C.likes, {
                user_id: userId,
                post_id: postId,
                created_at: new Date().toISOString(),
            });
            return { liked: true, likes_count: rows.filter((row) => row.post_id === postId).length + 1 };
        },

        async unlikePost(userId, postId) {
            const rows = await store.read<StoredLike>(C.likes);
            await store.deleteWhere<StoredLike>(C.likes, (row) => row.user_id === userId && row.post_id === postId);
            return { liked: false, likes_count: rows.filter((row) => row.post_id === postId).length - 1 };
        },

        async isLiked(userId, postId) {
            const rows = await store.read<StoredLike>(C.likes);
            return rows.some((row) => row.user_id === userId && row.post_id === postId);
        },
    };
}
