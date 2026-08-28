import { type FollowUser, type Paginated, type PointsUser, type Post, type SpaceSkeleton, type UserPublic } from "./types";
import { authHeaders, qs, request } from "./http";

export function getSpace(userId: number): Promise<SpaceSkeleton> {
    return request<SpaceSkeleton>(`/users/${userId}/space`, { headers: authHeaders() });
}

export function getSpacePosts(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<Paginated<Post>> {
    return request<Paginated<Post>>(`/users/${userId}/space/posts${qs({ offset, limit })}`, { headers: authHeaders() });
}

export function getSpaceFavorites(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ items: Post[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }> {
    return request<{ items: Post[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }>(
        `/users/${userId}/space/favorites${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function getSpaceFollowing(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ items: FollowUser[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }> {
    return request<{ items: FollowUser[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }>(
        `/users/${userId}/space/following${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function getSpaceFollowers(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ items: FollowUser[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }> {
    return request<{ items: FollowUser[]; total: number; hidden: boolean; offset: number; limit: number; hasMore: boolean }>(
        `/users/${userId}/space/followers${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function updatePrivacy(flags: {
    is_favorites_public?: boolean;
    is_follows_public?: boolean;
}): Promise<{ success: boolean }> {
    return request<{ success: boolean }>("/user/privacy", {
        method: "PATCH",
        body: JSON.stringify(flags),
        headers: authHeaders(),
    });
}

export function updateProfile(options: {
    username?: string;
    avatar?: File | null;
    removeAvatar?: boolean;
}): Promise<UserPublic> {
    const form = new FormData();
    if (options.username) form.set("username", options.username);
    if (options.avatar) form.set("avatar", options.avatar);
    if (options.removeAvatar) form.set("remove_avatar", "1");
    return request<UserPublic>("/user/profile", { method: "PATCH", body: form, headers: authHeaders() });
}

export function rankUsersByFollowers({
    offset,
    limit,
}: {
    offset: number;
    limit: number;
}): Promise<{ items: FollowUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }> {
    return request<{ items: FollowUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }>(
        `/rank/followers${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function rankUsersByPostPoints({
    offset,
    limit,
}: {
    offset: number;
    limit: number;
}): Promise<{ items: PointsUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }> {
    return request<{ items: PointsUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }>(
        `/rank/post/points${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function searchUsers({
    offset,
    limit,
    keyword,
}: {
    offset: number;
    limit: number;
    keyword: string;
}): Promise<Paginated<FollowUser>> {
    return request<Paginated<FollowUser>>(`/search${qs({ offset, limit, type: "users", keyword })}`, {
        headers: authHeaders(),
    });
}