import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredFollow, StoredUser } from "../rows";
import { rankSearchUsers } from "../mappers";
import type { SearchUserRow } from "../mappers";
import type { SpaceUser, User, UserPublic } from "../types";
import type { UsersRepo } from "../plugin";

function publicOf(user: StoredUser): UserPublic {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        created_at: user.created_at,
    };
}

function spaceOf(user: StoredUser): SpaceUser {
    return {
        ...publicOf(user),
        is_favorites_public: user.is_favorites_public,
        is_follows_public: user.is_follows_public,
    };
}

export function createUsersRepo(store: CollectionStore): UsersRepo {
    return {
        async createUser(username, email, passwordHash, avatar) {
            const created = await store.insert<StoredUser>(C.users, {
                username,
                email,
                password_hash: passwordHash,
                avatar,
                created_at: new Date().toISOString(),
                is_favorites_public: true,
                is_follows_public: true,
            });
            return publicOf(created);
        },

        async findUserByEmail(email) {
            const users = await store.read<StoredUser>(C.users);
            const found = users.find((user) => user.email === email);
            return found ? (found as User) : null;
        },

        async findUserByUsername(username) {
            const users = await store.read<StoredUser>(C.users);
            const found = users.find((user) => user.username === username);
            return found ? (found as User) : null;
        },

        async findUserByUsernameOrEmail(login) {
            return (await this.findUserByEmail(login)) ?? (await this.findUserByUsername(login));
        },

        async findUserById(id) {
            const user = await store.getById<StoredUser>(C.users, id);
            return user ? publicOf(user) : null;
        },

        async getSpaceUser(id) {
            const user = await store.getById<StoredUser>(C.users, id);
            return user ? spaceOf(user) : null;
        },

        async userExists(id) {
            return (await store.getById<StoredUser>(C.users, id)) != null;
        },

        async getSpaceCounts(userId) {
            const [posts, favorites, follows] = await Promise.all([
                store.read<{ user_id: number }>(C.posts),
                store.read<{ user_id: number }>(C.favorites),
                store.read<StoredFollow>(C.follows),
            ]);
            return {
                posts: posts.filter((post) => post.user_id === userId).length,
                favorites: favorites.filter((fav) => fav.user_id === userId).length,
                following: follows.filter((f) => f.follower_id === userId).length,
                followers: follows.filter((f) => f.following_id === userId).length,
            };
        },

        async updatePrivacy(userId, isFavoritesPublic, isFollowsPublic) {
            const patch: Partial<StoredUser> = {};
            if (isFavoritesPublic !== undefined) patch.is_favorites_public = isFavoritesPublic;
            if (isFollowsPublic !== undefined) patch.is_follows_public = isFollowsPublic;
            if (Object.keys(patch).length === 0) return;
            await store.updateById<StoredUser>(C.users, userId, patch);
        },

        async updateUserProfile(userId, changes) {
            const patch: Partial<StoredUser> = {};
            if (changes.username !== undefined) patch.username = changes.username;
            if (changes.avatar !== undefined) patch.avatar = changes.avatar;
            if (Object.keys(patch).length === 0) return this.findUserById(userId);
            const updated = await store.updateById<StoredUser>(C.users, userId, patch);
            return updated ? publicOf(updated) : null;
        },

        async searchUsers(options, viewerId) {
            const { keyword, offset, limit } = options;
            const [users, follows] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredFollow>(C.follows),
            ]);
            const kw = keyword.toLowerCase();
            const rows = users.filter((user) => user.username.toLowerCase().includes(kw));

            const enriched: SearchUserRow[] = rows.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                created_at: user.created_at,
                followers: follows.filter((f) => f.following_id === user.id).length,
                is_following:
                    viewerId != null && follows.some((f) => f.follower_id === viewerId && f.following_id === user.id),
            }));

            return rankSearchUsers(enriched, { offset, limit });
        },
    };
}
