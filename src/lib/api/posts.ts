import { type Paginated, type Post } from "./types";
import { authHeaders, qs, request } from "./http";

export function listPosts(options: {
    offset?: number;
    limit?: number;
    tag?: string | null;
    sort?: "latest" | "hot";
}): Promise<Paginated<Post>> {
    return request<Paginated<Post>>(
        `/posts${qs({ offset: options.offset ?? 0, limit: options.limit ?? 20, tag: options.tag, sort: options.sort })}`,
        {
            headers: authHeaders(),
        },
    );
}

export function getPost(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}`, { headers: authHeaders() });
}

export function getPostDraft(
    id: number,
): Promise<{ id: number; status: "draft" | "published"; post_id: number | null }> {
    return request<{ id: number; status: "draft" | "published"; post_id: number | null }>(`/posts/${id}/draft`, {
        headers: authHeaders(),
    });
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

export function setPostCommentArea(id: number, open: boolean): Promise<Post> {
    return request<Post>(`/posts/${id}/comment-area`, {
        method: "PATCH",
        body: JSON.stringify({ comment_area: open }),
        headers: authHeaders(),
    });
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
}): Promise<Paginated<Post>> {
    return request<Paginated<Post>>(`/search${qs({ offset, limit, type: "posts", keyword, sort })}`, {
        headers: authHeaders(),
    });
}