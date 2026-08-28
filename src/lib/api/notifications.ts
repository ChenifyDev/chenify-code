import { type AppNotification, type Paginated } from "./types";
import { authHeaders, qs, request } from "./http";

export function listNotifications(offset = 0, limit = 20): Promise<Paginated<AppNotification>> {
    return request<Paginated<AppNotification>>(`/notifications${qs({ offset, limit })}`, { headers: authHeaders() });
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