export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | undefined;
    created_at: string;
}

export interface UserSummary {
    id: number;
    username: string;
    avatar: string | undefined;
    created_at: string;
}

export interface Post {
    id: number;
    content: string;
    created_at: string;
    author: UserSummary;
    images: string[];
    tags: string[];
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    is_following_author: boolean;
}

export interface Comment {
    id: number;
    post_id: number;
    content: string;
    created_at: string;
    author: UserSummary;
    post_snippet: string;
}

export interface SpaceUser extends UserPublic {
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface SpaceCounts {
    posts: number;
    favorites: number | null;
    following: number | null;
    followers: number | null;
}

export interface SpaceRelation {
    is_following: boolean;
    is_followed_by: boolean;
}

export interface SpaceSkeleton {
    user: SpaceUser;
    counts: SpaceCounts;
    relation: SpaceRelation | null;
}

export interface FollowUser extends UserSummary {
    is_following: boolean;
}

export interface Draft {
    id: number;
    content: string;
    user_id: number;
    status: "draft" | "published";
    post_id: number | null;
    created_at: string;
    updated_at: string;
    images: string[];
    tags: string[];
}

interface LoginResponse {
    token: string;
    user: UserPublic;
}

const TOKEN_KEY = "chenify_token";

export function setToken(token: string, remember: boolean): void {
    const storage = remember ? localStorage : sessionStorage;
    if (!remember) localStorage.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const isJson = typeof init?.body === "string";
    const res = await fetch(`/api${path}`, {
        ...init,
        headers: {
            ...(isJson ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    const data = (await res.json().catch(() => null)) as { message?: string } | null;

    if (!res.ok) {
        throw new Error(data?.message ?? `请求失败（${res.status}）`);
    }
    return data as T;
}

export function login(login: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/passport/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
    });
}

export function register(username: string, email: string, password: string, avatar?: File | null): Promise<UserPublic> {
    const form = new FormData();
    form.set("username", username);
    form.set("email", email);
    form.set("password", password);
    if (avatar) form.set("avatar", avatar);
    return request<UserPublic>("/passport/register", { method: "POST", body: form });
}

export function me(): Promise<UserPublic> {
    return request<UserPublic>("/passport/me", {
        headers: authHeaders(),
    });
}

function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    }
    const text = query.toString();
    return text ? `?${text}` : "";
}

export function listPosts(options: {
    offset?: number;
    limit?: number;
    tag?: string | null;
    sort?: "latest" | "hot";
}): Promise<Post[]> {
    return request<Post[]>(`/posts${qs({ offset: options.offset ?? 0, limit: options.limit ?? 20, tag: options.tag, sort: options.sort })}`, {
        headers: authHeaders(),
    });
}

export function getPost(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}`, { headers: authHeaders() });
}

export function createPost(content: string, images: File[], tags: string[]): Promise<Post> {
    const form = new FormData();
    form.set("content", content);
    form.set("tags", tags.join(","));
    for (const image of images) form.append("images", image);
    return request<Post>("/posts", { method: "POST", body: form, headers: authHeaders() });
}

export function deletePost(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/posts/${id}`, { method: "DELETE", headers: authHeaders() });
}

export function listTags(): Promise<string[]> {
    return request<string[]>("/tags");
}

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

export function listComments(postId: number, offset = 0, limit = 20): Promise<Comment[]> {
    return request<Comment[]>(`/posts/${postId}/comments${qs({ offset, limit })}`);
}

export function createComment(postId: number, content: string): Promise<Comment> {
    return request<Comment>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
        headers: authHeaders(),
    });
}

export function deleteComment(commentId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/comments/${commentId}`, { method: "DELETE", headers: authHeaders() });
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

export function getSpace(userId: number): Promise<SpaceSkeleton> {
    return request<SpaceSkeleton>(`/users/${userId}/space`, { headers: authHeaders() });
}

export function getSpacePosts(userId: number, offset = 0, limit = 20): Promise<Post[]> {
    return request<Post[]>(`/users/${userId}/space/posts${qs({ offset, limit })}`, { headers: authHeaders() });
}

export function getSpaceFavorites(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ posts: Post[]; hidden: boolean; offset: number; limit: number }> {
    return request<{ posts: Post[]; hidden: boolean; offset: number; limit: number }>(
        `/users/${userId}/space/favorites${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function getSpaceFollowing(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ users: FollowUser[]; hidden: boolean; offset: number; limit: number }> {
    return request<{ users: FollowUser[]; hidden: boolean; offset: number; limit: number }>(
        `/users/${userId}/space/following${qs({ offset, limit })}`,
        { headers: authHeaders() },
    );
}

export function getSpaceFollowers(
    userId: number,
    offset = 0,
    limit = 20,
): Promise<{ users: FollowUser[]; hidden: boolean; offset: number; limit: number }> {
    return request<{ users: FollowUser[]; hidden: boolean; offset: number; limit: number }>(
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

export function listDrafts(status?: "draft" | "published", offset = 0, limit = 20): Promise<Draft[]> {
    return request<Draft[]>(`/drafts${qs({ status, offset, limit })}`, { headers: authHeaders() });
}

export function getDraft(id: number): Promise<Draft> {
    return request<Draft>(`/drafts/${id}`, { headers: authHeaders() });
}

export function publishDraft(id: number): Promise<Post> {
    return request<Post>(`/drafts/${id}/publish`, { method: "POST", headers: authHeaders() });
}

export function unpublishDraft(id: number): Promise<Draft> {
    return request<Draft>(`/drafts/${id}/unpublish`, { method: "POST", headers: authHeaders() });
}

export function deleteDraft(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/drafts/${id}`, { method: "DELETE", headers: authHeaders() });
}
