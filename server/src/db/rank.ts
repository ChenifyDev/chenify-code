import type { FollowUser, PointsUser } from "./types.ts";
import { eq, type SQL, type SQLWrapper, sql } from "drizzle-orm";
import { db } from "./client.ts";
import { favorites, follows, likes, posts, users } from "./schema.ts";

const followerCount = sql<number>`(SELECT COUNT(*) FROM ${follows} f WHERE f.following_id = ${users.id})`;

function pointsFor(idExpr: SQLWrapper): SQL<number> {
    return sql<number>`(
        (SELECT COUNT(*) FROM ${likes} l JOIN ${posts} p ON p.id = l.post_id WHERE p.user_id = ${idExpr})
        + 2 * (SELECT COUNT(*) FROM ${favorites} f JOIN ${posts} p ON p.id = f.post_id WHERE p.user_id = ${idExpr})
    )`;
}

const scoreFollowers = "(SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)";
const scorePoints =
    "((SELECT COUNT(*) FROM likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = u.id)" +
    " + 2 * (SELECT COUNT(*) FROM favorites fv JOIN posts p ON p.id = fv.post_id WHERE p.user_id = u.id))";

type RankRow = {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    created_at: string;
    score: number;
    is_following: number;
    rank: number;
};

function rankBy(viewerId: number, score: string, options: { offset: number; limit: number }): RankRow[] {
    const { offset, limit } = options;
    return db.all(sql`
        SELECT *
        FROM (SELECT u.id,
                     u.username,
                     u.email,
                     u.avatar,
                     u.created_at,
                     ${sql.raw(score)}                                                      AS score,
                     EXISTS (SELECT 1
                             FROM ${follows} ff
                             WHERE ff.follower_id = ${viewerId} AND ff.following_id = u.id) AS is_following,
                     RANK() OVER (ORDER BY ${sql.raw(score)} DESC, u.id)                    AS rank
              FROM ${users} u)
        ORDER BY rank
        LIMIT ${limit} OFFSET ${offset}
    `) as unknown as RankRow[];
}

export function rankUsersByFollowers(viewerId: number, options: { offset: number; limit: number }): FollowUser[] {
    return rankBy(viewerId, scoreFollowers, options).map(({ score, is_following, ...rest }) => ({
        ...rest,
        followers: score,
        is_following: is_following === 1,
    })) as unknown as FollowUser[];
}

export function rankUsersByPoints(viewerId: number, options: { offset: number; limit: number }): PointsUser[] {
    return rankBy(viewerId, scorePoints, options).map(({ score, is_following, ...rest }) => ({
        ...rest,
        points: score,
        is_following: is_following === 1,
    })) as unknown as PointsUser[];
}

export function getFollowerRank(userId: number): number {
    const row = db
        .select({
            rank: sql<number>`(SELECT COUNT(*) + 1 FROM ${users} WHERE ${followerCount} > (SELECT COUNT(*) FROM ${follows} WHERE ${follows.following_id} = ${userId}))`,
        })
        .from(users)
        .where(eq(users.id, userId))
        .get();
    return row?.rank ?? 0;
}

export function getPointsRank(userId: number): number {
    const row = db
        .select({
            rank: sql<number>`(SELECT COUNT(*) + 1 FROM ${users} WHERE ${pointsFor(users.id)} > ${pointsFor(sql`${userId}`)})`,
        })
        .from(users)
        .where(eq(users.id, userId))
        .get();
    return row?.rank ?? 0;
}
