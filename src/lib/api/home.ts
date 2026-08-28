import { type Post } from "./types";
import { authHeaders, qs, request } from "./http";

export function listFollowingPosts({
    offset,
    limit,
}: {
    offset: number;
    limit: number;
}): Promise<{ posts: Post[]; total: number; offset: number; limit: number; hasMore: boolean }> {
    return request<{ posts: Post[]; total: number; offset: number; limit: number; hasMore: boolean }>(
        `/home/following${qs({ offset, limit })}`,
        {
            headers: authHeaders(),
        },
    );
}