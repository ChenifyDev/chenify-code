import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredUser } from "../rows";
import type { UserSummary } from "../types";

export async function fetchAuthors(store: CollectionStore, userIds: number[]): Promise<Map<number, UserSummary>> {
    const map = new Map<number, UserSummary>();
    if (userIds.length === 0) return map;
    const users = await store.read<StoredUser>(C.users);
    for (const user of users) {
        if (userIds.includes(user.id))
            map.set(user.id, {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                created_at: user.created_at,
            });
    }
    return map;
}

export async function authorOf(store: CollectionStore, userId: number): Promise<UserSummary> {
    const map = await fetchAuthors(store, [userId]);
    return map.get(userId) ?? { id: userId, username: "未知用户", avatar: null, created_at: "" };
}
