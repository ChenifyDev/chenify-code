import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredFollow, StoredLike, StoredFavorite, StoredPost, StoredUser } from "../rows";
import type { FollowUser, PointsUser, UserSummary } from "../types";
import type { RankRepo } from "../plugin";

function summaryOf(user: StoredUser | undefined, fallbackId: number): UserSummary {
    return user
        ? { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at }
        : { id: fallbackId, username: "未知用户", avatar: null, created_at: "" };
}

export function createRankRepo(store: CollectionStore): RankRepo {
    return {
        async rankUsersByFollowers(viewerId, options) {
            const [users, follows] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredFollow>(C.follows),
            ]);
            const followersOf = (userId: number) => follows.filter((f) => f.following_id === userId).length;
            const ranked = [...users]
                .sort((a, b) => followersOf(b.id) - followersOf(a.id) || a.id - b.id)
                .map((user, index) => ({
                    ...summaryOf(user, user.id),
                    email: user.email,
                    followers: followersOf(user.id),
                    is_following: follows.some((f) => f.follower_id === viewerId && f.following_id === user.id),
                    rank: index + 1,
                }));
            const page = ranked.slice(options.offset, options.offset + options.limit);
            return page.map(({ followers, is_following, ...rest }) => ({
                ...rest,
                followers,
                is_following,
            })) as FollowUser[];
        },

        async rankUsersByPoints(viewerId, options) {
            const [users, posts, likes, favorites, follows] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredPost>(C.posts),
                store.read<StoredLike>(C.likes),
                store.read<StoredFavorite>(C.favorites),
                store.read<StoredFollow>(C.follows),
            ]);
            const pointsOf = (userId: number) => {
                const ownPostIds = posts.filter((p) => p.user_id === userId).map((p) => p.id);
                const likeCount = likes.filter((l) => ownPostIds.includes(l.post_id)).length;
                const favCount = favorites.filter((f) => ownPostIds.includes(f.post_id)).length;
                return likeCount + 2 * favCount;
            };
            const ranked = [...users]
                .sort((a, b) => pointsOf(b.id) - pointsOf(a.id) || a.id - b.id)
                .map((user, index) => ({
                    ...summaryOf(user, user.id),
                    email: user.email,
                    points: pointsOf(user.id),
                    is_following: follows.some((f) => f.follower_id === viewerId && f.following_id === user.id),
                    rank: index + 1,
                }));
            return ranked.slice(options.offset, options.offset + options.limit) as unknown as PointsUser[];
        },

        async getFollowerRank(userId) {
            const [users, follows] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredFollow>(C.follows),
            ]);
            const followersOf = (id: number) => follows.filter((f) => f.following_id === id).length;
            const mine = followersOf(userId);
            return users.filter((u) => followersOf(u.id) > mine).length + 1;
        },

        async getPointsRank(userId) {
            const [users, posts, likes, favorites] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredPost>(C.posts),
                store.read<StoredLike>(C.likes),
                store.read<StoredFavorite>(C.favorites),
            ]);
            const pointsOf = (uid: number) => {
                const ownPostIds = posts.filter((p) => p.user_id === uid).map((p) => p.id);
                return (
                    likes.filter((l) => ownPostIds.includes(l.post_id)).length +
                    2 * favorites.filter((f) => ownPostIds.includes(f.post_id)).length
                );
            };
            const mine = pointsOf(userId);
            return users.filter((u) => pointsOf(u.id) > mine).length + 1;
        },
    };
}
