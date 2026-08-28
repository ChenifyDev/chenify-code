import { type Draft, type Paginated, type Post } from "./types";
import { authHeaders, qs, request } from "./http";

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

export function listDrafts(
    status?: "draft" | "published",
    offset = 0,
    limit = 20,
): Promise<Paginated<Draft>> {
    return request<Paginated<Draft>>(`/drafts${qs({ status, offset, limit })}`, { headers: authHeaders() });
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