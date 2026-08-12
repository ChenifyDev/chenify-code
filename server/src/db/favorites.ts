import { and, count, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { favorites } from "./schema";

function countFavorites(postId: number): number {
    return db.select({ n: count() }).from(favorites).where(eq(favorites.post_id, postId)).get()!.n;
}

export function toggleFavorite(userId: number, postId: number): { favorited: boolean; favorites_count: number } {
    const existing = db
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.user_id, userId), eq(favorites.post_id, postId)))
        .get();
    if (existing) {
        db.delete(favorites)
            .where(and(eq(favorites.user_id, userId), eq(favorites.post_id, postId)))
            .run();
        return { favorited: false, favorites_count: countFavorites(postId) };
    }
    db.insert(favorites).values({ user_id: userId, post_id: postId }).onConflictDoNothing().run();
    return { favorited: true, favorites_count: countFavorites(postId) };
}

export function unfavoritePost(userId: number, postId: number): { favorited: boolean; favorites_count: number } {
    db.delete(favorites)
        .where(and(eq(favorites.user_id, userId), eq(favorites.post_id, postId)))
        .run();
    return { favorited: false, favorites_count: countFavorites(postId) };
}

export function isFavorited(userId: number, postId: number): boolean {
    return (
        db
            .select({ id: favorites.id })
            .from(favorites)
            .where(and(eq(favorites.user_id, userId), eq(favorites.post_id, postId)))
            .get() != null
    );
}
