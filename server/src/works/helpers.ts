import { inArray } from "drizzle-orm";
import { db as mainDb } from "../db/client";
import { users } from "../db/schema";
import type { UserSummary } from "../db";

export function fetchAuthors(userIds: number[]): Map<number, UserSummary> {
    const map = new Map<number, UserSummary>();
    if (userIds.length === 0) return map;
    const rows = mainDb
        .select({ id: users.id, username: users.username, avatar: users.avatar, created_at: users.created_at })
        .from(users)
        .where(inArray(users.id, userIds))
        .all();
    for (const row of rows) map.set(row.id, row);
    return map;
}

export function authorOf(userId: number): UserSummary {
    return fetchAuthors([userId]).get(userId) ?? { id: userId, username: "未知用户", avatar: null, created_at: "" };
}
