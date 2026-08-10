import { and, desc, eq, sql } from "drizzle-orm";
import { alias, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { db } from "./client";
import { follows, users } from "./schema";
import type { FollowUser, FollowUserRow } from "./types";

function countFollowers(userId: number): number {
    return db
        .select({ n: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.following_id, userId))
        .get()!.n;
}

export function toggleFollow(
    followerId: number,
    followingId: number,
): { following: boolean; followers_count: number } {
    const existing = db
        .select({ one: sql`1` })
        .from(follows)
        .where(and(eq(follows.follower_id, followerId), eq(follows.following_id, followingId)))
        .get();
    if (existing) {
        db.delete(follows)
            .where(and(eq(follows.follower_id, followerId), eq(follows.following_id, followingId)))
            .run();
        return { following: false, followers_count: countFollowers(followingId) };
    }
    db.insert(follows).values({ follower_id: followerId, following_id: followingId }).run();
    return { following: true, followers_count: countFollowers(followingId) };
}

export function unfollowUser(
    followerId: number,
    followingId: number,
): { following: boolean; followers_count: number } {
    db.delete(follows)
        .where(and(eq(follows.follower_id, followerId), eq(follows.following_id, followingId)))
        .run();
    return { following: false, followers_count: countFollowers(followingId) };
}

export function isFollowing(followerId: number, followingId: number): boolean {
    return (
        db
            .select({ one: sql`1` })
            .from(follows)
            .where(and(eq(follows.follower_id, followerId), eq(follows.following_id, followingId)))
            .get() != null
    );
}

function followQuery(
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
    joinColumn: AnySQLiteColumn,
    filterColumn: AnySQLiteColumn,
) {
    const other = alias(follows, "f2");
    const base = {
        id: users.id,
        username: users.username,
        avatar: users.avatar,
        created_at: users.created_at,
        is_following: sql<number>`CASE WHEN ${other.follower_id} IS NOT NULL THEN 1 ELSE 0 END`,
    } as const;
    return db
        .select(base)
        .from(follows)
        .innerJoin(users, eq(users.id, joinColumn))
        .leftJoin(other, and(eq(other.follower_id, viewerId ?? 0), eq(other.following_id, users.id)))
        .where(eq(filterColumn, ownerId))
        .orderBy(desc(follows.created_at))
        .limit(options.limit)
        .offset(options.offset);
}

export function listFollowing(
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): FollowUser[] {
    const rows = followQuery(ownerId, viewerId, options, follows.following_id, follows.follower_id).all() as unknown as FollowUserRow[];
    return rows.map((row) => ({ ...row, is_following: row.is_following === 1 }));
}

export function listFollowers(
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): FollowUser[] {
    const rows = followQuery(ownerId, viewerId, options, follows.follower_id, follows.following_id).all() as unknown as FollowUserRow[];
    return rows.map((row) => ({ ...row, is_following: row.is_following === 1 }));
}