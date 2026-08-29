import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredFollow, StoredUser } from "../rows";
import type { FollowUser, UserSummary } from "../types";
import type { FollowsRepo } from "../plugin";

async function fetchFollowUsers(
    store: CollectionStore,
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
    filter: (follow: StoredFollow) => boolean,
    pick: (follow: StoredFollow) => number,
): Promise<FollowUser[]> {
    const [follows, users] = await Promise.all([store.read<StoredFollow>(C.follows), store.read<StoredUser>(C.users)]);
    const userMap = new Map(users.map((user) => [user.id, user]));

    const ordered = follows
        .filter(filter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(options.offset, options.offset + options.limit);

    return ordered.map((follow) => {
        const userId = pick(follow);
        const user = userMap.get(userId);
        const summary: UserSummary = user
            ? { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at }
            : { id: userId, username: "未知用户", avatar: null, created_at: "" };
        return {
            ...summary,
            is_following:
                viewerId != null && follows.some((f) => f.follower_id === viewerId && f.following_id === userId),
        };
    });
}

export function createFollowsRepo(store: CollectionStore): FollowsRepo {
    return {
        async toggleFollow(followerId, followingId) {
            const rows = await store.read<StoredFollow>(C.follows);
            const existing = rows.some((row) => row.follower_id === followerId && row.following_id === followingId);
            if (existing) {
                await store.deleteWhere<StoredFollow>(
                    C.follows,
                    (row) => row.follower_id === followerId && row.following_id === followingId,
                );
                return {
                    following: false,
                    followers_count: rows.filter((row) => row.following_id === followingId).length - 1,
                };
            }
            await store.append<StoredFollow>(C.follows, {
                follower_id: followerId,
                following_id: followingId,
                created_at: new Date().toISOString(),
            });
            return {
                following: true,
                followers_count: rows.filter((row) => row.following_id === followingId).length + 1,
            };
        },

        async unfollowUser(followerId, followingId) {
            const rows = await store.read<StoredFollow>(C.follows);
            await store.deleteWhere<StoredFollow>(
                C.follows,
                (row) => row.follower_id === followerId && row.following_id === followingId,
            );
            return {
                following: false,
                followers_count: rows.filter((row) => row.following_id === followingId).length - 1,
            };
        },

        async isFollowing(followerId, followingId) {
            const rows = await store.read<StoredFollow>(C.follows);
            return rows.some((row) => row.follower_id === followerId && row.following_id === followingId);
        },

        async listFollowing(ownerId, viewerId, options) {
            return fetchFollowUsers(
                store,
                ownerId,
                viewerId,
                options,
                (f) => f.follower_id === ownerId,
                (f) => f.following_id,
            );
        },

        async countFollowing(ownerId) {
            const rows = await store.read<StoredFollow>(C.follows);
            return rows.filter((f) => f.follower_id === ownerId).length;
        },

        async listFollowers(ownerId, viewerId, options) {
            return fetchFollowUsers(
                store,
                ownerId,
                viewerId,
                options,
                (f) => f.following_id === ownerId,
                (f) => f.follower_id,
            );
        },

        async countFollowers(ownerId) {
            const rows = await store.read<StoredFollow>(C.follows);
            return rows.filter((f) => f.following_id === ownerId).length;
        },
    };
}
