import { type PostComment } from "./types";
import { authHeaders, qs, request } from "./http";

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