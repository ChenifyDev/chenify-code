import { count, eq, inArray, like, type SQL, sql } from "drizzle-orm";
import { db } from "./client";
import { db as worksDb } from "../works";
import { favorites, follows, posts, users } from "./schema";
import type { FollowUser, SpaceUser, User, UserPublic } from "./types";
import { works } from "../works/schema.ts";

const publicCols = {
    id: users.id,
    username: users.username,
    email: users.email,
    avatar: users.avatar,
    created_at: users.created_at,
} as const;

export function createUser(username: string, email: string, passwordHash: string, avatar: string | null): UserPublic {
    return db
        .insert(users)
        .values({
            username,
            email,
            password_hash: passwordHash,
            avatar,
            created_at: new Date().toISOString(),
        })
        .returning(publicCols)
        .get();
}

export function findUserByEmail(email: string): User | null {
    const row = db.select().from(users).where(eq(users.email, email)).get();
    return (row as User | undefined) ?? null;
}

export function findUserByUsername(username: string): User | null {
    const row = db.select().from(users).where(eq(users.username, username)).get();
    return (row as User | undefined) ?? null;
}

export function findUserByUsernameOrEmail(login: string): User | null {
    return findUserByEmail(login) ?? findUserByUsername(login);
}

export function findUserById(id: number): UserPublic | null {
    const row = db.select(publicCols).from(users).where(eq(users.id, id)).get();
    return row ?? null;
}

export function toPublicUser(user: User): UserPublic {
    const { password_hash: _passwordHash, ...publicUser } = user;
    return publicUser;
}

export function getSpaceUser(id: number): SpaceUser | null {
    const row = db
        .select({
            id: users.id,
            username: users.username,
            email: users.email,
            avatar: users.avatar,
            created_at: users.created_at,
            is_favorites_public: users.is_favorites_public,
            is_follows_public: users.is_follows_public,
        })
        .from(users)
        .where(eq(users.id, id))
        .get();
    return row ?? null;
}

export function userExists(id: number): boolean {
    const row = db
        .select({ one: sql.raw("1") })
        .from(users)
        .where(eq(users.id, id))
        .get();
    return row != null;
}

export function getSpaceCounts(userId: number): {
    posts: number;
    works: number;
    favorites: number;
    following: number;
    followers: number;
} {
    const postsN = db.select({ n: count() }).from(posts).where(eq(posts.user_id, userId)).get()!.n;
    const worksN = worksDb.select({ n: count() }).from(works).where(eq(works.user_id, userId)).get()!.n;
    const favoritesN = db.select({ n: count() }).from(favorites).where(eq(favorites.user_id, userId)).get()!.n;
    const followingN = db.select({ n: count() }).from(follows).where(eq(follows.follower_id, userId)).get()!.n;
    const followersN = db.select({ n: count() }).from(follows).where(eq(follows.following_id, userId)).get()!.n;
    return { posts: postsN, works: worksN, favorites: favoritesN, following: followingN, followers: followersN };
}

export function updatePrivacy(
    userId: number,
    isFavoritesPublic: boolean | undefined,
    isFollowsPublic: boolean | undefined,
): void {
    const set: Partial<{ is_favorites_public: boolean; is_follows_public: boolean }> = {};
    if (isFavoritesPublic !== undefined) set.is_favorites_public = isFavoritesPublic;
    if (isFollowsPublic !== undefined) set.is_follows_public = isFollowsPublic;
    if (Object.keys(set).length === 0) return;
    db.update(users).set(set).where(eq(users.id, userId)).run();
}

export async function searchUsers(
    options: { offset: number; limit: number; keyword: string },
    viewerId: number | null,
): Promise<FollowUser[]> {
    const { offset, limit, keyword } = options;

    const followerCount = sql<number>`(SELECT COUNT(*) FROM ${follows} WHERE ${follows.following_id} = ${users.id})`;
    const isFollowingExpr = viewerId
        ? sql<boolean>`EXISTS (SELECT 1 FROM ${follows} WHERE ${follows.follower_id} = ${viewerId} AND ${follows.following_id} = ${users.id})`
        : (sql.raw("0") as SQL<boolean>);

    const rows = db
        .select({
            id: users.id,
            username: users.username,
            email: users.email,
            avatar: users.avatar,
            created_at: users.created_at,
            followers: followerCount,
            is_following: isFollowingExpr,
        })
        .from(users)
        .where(like(users.username, `%${keyword}%`))
        .all();

    const workCounts = new Map<number, number>();
    if (rows.length > 0) {
        const counts = worksDb
            .select({ user_id: works.user_id, n: count() })
            .from(works)
            .where(
                inArray(
                    works.user_id,
                    rows.map((r) => r.id),
                ),
            )
            .groupBy(works.user_id)
            .all();
        for (const row of counts) workCounts.set(row.user_id, row.n);
    }

    const scored = rows
        .map((row) => ({
            id: row.id,
            username: row.username,
            email: row.email,
            avatar: row.avatar,
            created_at: row.created_at,
            followers: row.followers,
            is_following: row.is_following,
            score: row.followers * 3 + (workCounts.get(row.id) ?? 0) * 2,
        }))
        .sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at))
        .slice(offset, offset + limit);

    return scored.map(({ score: _score, ...user }) => user);
}
