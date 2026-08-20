import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredFavorite } from "../rows";
import type { FavoritesRepo } from "../plugin";

export function createFavoritesRepo(store: CollectionStore): FavoritesRepo {
    return {
        async toggleFavorite(userId, postId) {
            const rows = await store.read<StoredFavorite>(C.favorites);
            const existing = rows.find((row) => row.user_id === userId && row.post_id === postId);
            if (existing) {
                await store.deleteWhere<StoredFavorite>(
                    C.favorites,
                    (row) => row.user_id === userId && row.post_id === postId,
                );
                return { favorited: false, favorites_count: rows.filter((row) => row.post_id === postId).length - 1 };
            }
            await store.insert<StoredFavorite>(C.favorites, {
                user_id: userId,
                post_id: postId,
                created_at: new Date().toISOString(),
            });
            return { favorited: true, favorites_count: rows.filter((row) => row.post_id === postId).length + 1 };
        },

        async unfavoritePost(userId, postId) {
            const rows = await store.read<StoredFavorite>(C.favorites);
            await store.deleteWhere<StoredFavorite>(
                C.favorites,
                (row) => row.user_id === userId && row.post_id === postId,
            );
            return { favorited: false, favorites_count: rows.filter((row) => row.post_id === postId).length - 1 };
        },

        async isFavorited(userId, postId) {
            const rows = await store.read<StoredFavorite>(C.favorites);
            return rows.some((row) => row.user_id === userId && row.post_id === postId);
        },
    };
}
