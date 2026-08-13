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

export interface PostComment {
    id: number;
    post_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    author: UserSummary;
    post_snippet: string;
    likes_count: number;
    is_liked: boolean;
    replies: PostComment[];
}

export interface SpaceUser extends UserPublic {
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface SpaceCounts {
    posts: number;
    works: number;
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
    email: string;
    followers: number;
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

export interface WorkFile {
    id: number;
    name: string;
    path: string;
    size: number;
}

export interface WorkSummary {
    id: number;
    title: string;
    description: string;
    cover: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    author: UserSummary;
    files_count: number;
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    is_following_author: boolean;
}

export interface WorkDetail extends WorkSummary {
    files: WorkFile[];
}

export interface WorkComment {
    id: number;
    work_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    author: UserSummary;
    likes_count: number;
    is_liked: boolean;
    replies: WorkComment[];
}

export interface WorkDraft {
    id: number;
    user_id: number;
    title: string;
    description: string;
    cover: string;
    status: "draft" | "published";
    work_id: number | null;
    draft_id: number | null;
    created_at: string;
    updated_at: string;
    files_count: number;
    files: WorkFile[];
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
    return request<Post[]>(
        `/posts${qs({ offset: options.offset ?? 0, limit: options.limit ?? 20, tag: options.tag, sort: options.sort })}`,
        {
            headers: authHeaders(),
        },
    );
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

export function createDraft(content: string, images: File[], tags: string[]): Promise<Draft> {
    const form = new FormData();
    form.set("content", content);
    form.set("tags", tags.join(","));
    for (const image of images) form.append("images", image);
    return request<Draft>("/drafts", { method: "POST", body: form, headers: authHeaders() });
}

export function updateDraft(id: number, content: string, images: File[], tags: string[]): Promise<Draft> {
    const form = new FormData();
    form.set("content", content);
    form.set("tags", tags.join(","));
    for (const image of images) form.append("images", image);
    return request<Draft>(`/drafts/${id}`, { method: "PATCH", body: form, headers: authHeaders() });
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

type Comment = PostComment;
export function listComments(postId: number, offset = 0, limit = 20): Promise<Comment[]> {
    return request<Comment[]>(`/posts/${postId}/comments${qs({ offset, limit })}`, {
        headers: authHeaders(),
    });
}

export function createComment(postId: number, content: string, parentId?: number | null): Promise<Comment> {
    return request<Comment>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parent_id: parentId ?? null }),
        headers: authHeaders(),
    });
}

export function deleteComment(commentId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/comments/${commentId}`, { method: "DELETE", headers: authHeaders() });
}

export function toggleCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/comments/${commentId}/like`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/comments/${commentId}/like`, {
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

export function getSpace(userId: number): Promise<SpaceSkeleton> {
    return request<SpaceSkeleton>(`/users/${userId}/space`, { headers: authHeaders() });
}

export function getSpacePosts(userId: number, offset = 0, limit = 20): Promise<Post[]> {
    return request<Post[]>(`/users/${userId}/space/posts${qs({ offset, limit })}`, { headers: authHeaders() });
}

export function getSpaceWorks(userId: number, offset = 0, limit = 20): Promise<WorkSummary[]> {
    return request<WorkSummary[]>(`/users/${userId}/space/works${qs({ offset, limit })}`, { headers: authHeaders() });
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

function workForm(title: string, description: string, files: File[], cover?: File | null): FormData {
    const form = new FormData();
    form.set("title", title);
    form.set("description", description);
    if (cover) form.set("cover", cover);
    for (const file of files) form.append("files", file);
    return form;
}

export function listWorks(options: {
    offset?: number;
    limit?: number;
    sort?: "latest" | "hot";
    authorId?: number | null;
}): Promise<WorkSummary[]> {
    return request<WorkSummary[]>(
        `/works${qs({ offset: options.offset ?? 0, limit: options.limit ?? 20, sort: options.sort, author_id: options.authorId })}`,
        {
            headers: authHeaders(),
        },
    );
}

export function getWork(id: number): Promise<WorkDetail> {
    return request<WorkDetail>(`/works/${id}`, { headers: authHeaders() });
}

export function createWork(title: string, description: string, files: File[], cover: File): Promise<WorkDetail> {
    return request<WorkDetail>("/works", {
        method: "POST",
        body: workForm(title, description, files, cover),
        headers: authHeaders(),
    });
}

export function updateWork(
    id: number,
    title: string,
    description: string,
    files: File[],
    cover?: File | null,
): Promise<WorkDetail> {
    return request<WorkDetail>(`/works/${id}`, {
        method: "PATCH",
        body: workForm(title, description, files, cover),
        headers: authHeaders(),
    });
}

export function deleteWork(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/works/${id}`, { method: "DELETE", headers: authHeaders() });
}

export function forkWork(id: number, cover?: File | null): Promise<WorkDetail> {
    const form = cover
        ? (() => {
              const f = new FormData();
              f.set("cover", cover);
              return f;
          })()
        : undefined;
    return request<WorkDetail>(`/works/${id}/fork`, {
        method: "POST",
        body: form,
        headers: authHeaders(),
    });
}

export function listForks(id: number, offset = 0, limit = 20): Promise<WorkSummary[]> {
    return request<WorkSummary[]>(`/works/${id}/forks${qs({ offset, limit })}`, { headers: authHeaders() });
}

export function toggleWorkLike(workId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/works/${workId}/like`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unWorkLike(workId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/works/${workId}/like`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}

export function toggleWorkFavorite(workId: number): Promise<{ favorited: boolean; favorites_count: number }> {
    return request<{ favorited: boolean; favorites_count: number }>(`/works/${workId}/favorite`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unWorkFavorite(workId: number): Promise<{ favorited: boolean; favorites_count: number }> {
    return request<{ favorited: boolean; favorites_count: number }>(`/works/${workId}/favorite`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}

export function listWorkComments(workId: number, offset = 0, limit = 20): Promise<WorkComment[]> {
    return request<WorkComment[]>(`/works/${workId}/comments${qs({ offset, limit })}`, {
        headers: authHeaders(),
    });
}

export function createWorkComment(workId: number, content: string, parentId?: number | null): Promise<WorkComment> {
    return request<WorkComment>(`/works/${workId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parent_id: parentId ?? null }),
        headers: authHeaders(),
    });
}

export function deleteWorkComment(commentId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/works/comments/${commentId}`, { method: "DELETE", headers: authHeaders() });
}

export function toggleWorkCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/works/comments/${commentId}/like`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function unWorkCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    return request<{ liked: boolean; likes_count: number }>(`/works/comments/${commentId}/like`, {
        method: "DELETE",
        headers: authHeaders(),
    });
}

export function listWorkDrafts(status?: "draft" | "published", offset = 0, limit = 20): Promise<WorkDraft[]> {
    return request<WorkDraft[]>(`/work-drafts${qs({ status, offset, limit })}`, { headers: authHeaders() });
}

export function getWorkDraft(id: number): Promise<WorkDraft> {
    return request<WorkDraft>(`/work-drafts/${id}`, { headers: authHeaders() });
}

export function createWorkDraft(
    title: string,
    description: string,
    files: File[],
    cover?: File | null,
): Promise<WorkDraft> {
    return request<WorkDraft>("/work-drafts", {
        method: "POST",
        body: workForm(title, description, files, cover),
        headers: authHeaders(),
    });
}

export function updateWorkDraft(
    id: number,
    title: string,
    description: string,
    files?: File[],
    cover?: File | null,
): Promise<WorkDraft> {
    return request<WorkDraft>(`/work-drafts/${id}`, {
        method: "PATCH",
        body: workForm(title, description, files ?? [], cover),
        headers: authHeaders(),
    });
}

export function publishWorkDraft(id: number): Promise<WorkDetail> {
    return request<WorkDetail>(`/work-drafts/${id}/publish`, { method: "POST", headers: authHeaders() });
}

export function unpublishWorkDraft(id: number): Promise<WorkDraft> {
    return request<WorkDraft>(`/work-drafts/${id}/unpublish`, { method: "POST", headers: authHeaders() });
}

export function deleteWorkDraft(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/work-drafts/${id}`, { method: "DELETE", headers: authHeaders() });
}

export function searchPosts({
    offset,
    limit,
    sort,
    keyword,
}: {
    offset: number;
    limit: number;
    sort: "latest" | "hot";
    keyword: string;
}): Promise<Post[]> {
    return request<Post[]>(`/search${qs({ offset, limit, type: "posts", keyword, sort })}`, { headers: authHeaders() });
}

export function searchWorks({
    offset,
    limit,
    sort,
    keyword,
}: {
    offset: number;
    limit: number;
    sort: "latest" | "hot";
    keyword: string;
}): Promise<WorkSummary[]> {
    return request<WorkSummary[]>(`/search${qs({ offset, limit, type: "works", keyword, sort })}`, {
        headers: authHeaders(),
    });
}

export function searchUsers({
    offset,
    limit,
    keyword,
}: {
    offset: number;
    limit: number;
    keyword: string;
}): Promise<FollowUser[]> {
    return request<FollowUser[]>(`/search${qs({ offset, limit, type: "users", keyword })}`, { headers: authHeaders() });
}

export type NotificationType = "post_comment" | "post_reply" | "work_comment" | "work_reply";

export interface AppNotification {
    id: number;
    type: NotificationType;
    actor: UserSummary;
    is_read: boolean;
    created_at: string;
    post_id: number | null;
    work_id: number | null;
    comment_id: number | null;
    snippet: string;
    reply_to: string | null;
    comment: string;
}

export function listNotifications(offset = 0, limit = 20): Promise<AppNotification[]> {
    return request<AppNotification[]>(`/notifications${qs({ offset, limit })}`, { headers: authHeaders() });
}

export function getUnreadNotifications(): Promise<{ count: number }> {
    return request<{ count: number }>("/notifications/unread-count", { headers: authHeaders() });
}

export function markNotificationsRead(ids?: number[]): Promise<{ success: boolean }> {
    return request<{ success: boolean }>("/notifications/read", {
        method: "POST",
        body: JSON.stringify(ids ? { ids } : {}),
        headers: authHeaders(),
    });
}
