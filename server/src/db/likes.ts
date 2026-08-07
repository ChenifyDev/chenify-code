import { and, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { likes } from "./schema";

function countLikes(postId: number): number {
    return db
        .select({ n: sql<number>`count(*)` })
        .from(likes)
        .where(eq(likes.post_id, postId))
        .get()!.n;
}

export function toggleLike(userId: number, postId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.user_id, userId), eq(likes.post_id, postId)))
        .get();
    if (existing) {
        db.delete(likes)
            .where(and(eq(likes.user_id, userId), eq(likes.post_id, postId)))
            .run();
        return { liked: false, likes_count: countLikes(postId) };
    }
    db.insert(likes).values({ user_id: userId, post_id: postId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countLikes(postId) };
}

export function unlikePost(userId: number, postId: number): { liked: boolean; likes_count: number } {
    db.delete(likes)
        .where(and(eq(likes.user_id, userId), eq(likes.post_id, postId)))
        .run();
    return { liked: false, likes_count: countLikes(postId) };
}

export function isLiked(userId: number, postId: number): boolean {
    return (
        db
            .select({ id: likes.id })
            .from(likes)
            .where(and(eq(likes.user_id, userId), eq(likes.post_id, postId)))
            .get() != null
    );
}