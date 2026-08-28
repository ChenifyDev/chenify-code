import { authHeaders, request } from "./http";

export function toggleFavorite(postId: number): Promise<{ favorited: boolean; favorites_count: number }> {
    return request<{ favorited: boolean; favorites_count: number }>(`/posts/${postId}/favorite`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unFavorite(postId: number): Promise<{ favorited: boolean; favorites_count: number }> {
    return request<{ favorited: boolean; favorites_count: number }>(`/posts/${postId}/favorite`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}

export function toggleLike(postId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unLike(postId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}

export function toggleFollow(userId: number): Promise<{ following: boolean; followers_count: number }> {
    return request<{ following: boolean; followers_count: number }>(`/users/${userId}/follow`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unFollow(userId: number): Promise<{ following: boolean; followers_count: number }> {
    return request<{ following: boolean; followers_count: number }>(`/users/${userId}/follow`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}