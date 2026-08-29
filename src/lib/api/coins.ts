import type { CoinPeriod, CoinUser } from "./types";
import { authHeaders, qs, request } from "./http";

export function tipPost(
    postId: number,
): Promise<{ success: boolean; balance: number; coins_count: number }> {
    return request<{ success: boolean; balance: number; coins_count: number }>(`/posts/${postId}/coin`, {
        method: "POST",
        headers: authHeaders(),
    });
}

export function tipUser(
    userId: number,
    amount: number,
): Promise<{ success: boolean; balance: number; coins_received: number }> {
    return request<{ success: boolean; balance: number; coins_received: number }>(`/users/${userId}/space/coin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount }),
    });
}

export function getMyCoins(): Promise<{ balance: number }> {
    return request<{ balance: number }>("/coins/me", { headers: authHeaders() });
}

export function getCheckinStatus(): Promise<{
    checked_today: boolean;
    balance: number;
    days: string[];
    total_days: number;
}> {
    return request<{ checked_today: boolean; balance: number; days: string[]; total_days: number }>(
        "/coins/checkin/status",
        { headers: authHeaders() },
    );
}

export function checkIn(): Promise<{ granted: boolean; balance: number }> {
    return request<{ granted: boolean; balance: number }>("/coins/checkin", {
        method: "POST",
        headers: authHeaders(),
    });
}

export function coinLeaderboard({
    period,
    offset,
    limit,
}: {
    period: CoinPeriod;
    offset: number;
    limit: number;
}): Promise<{ items: CoinUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }> {
    return request<{ items: CoinUser[]; total: number; hasMore: boolean; my_rank: number; offset: number; limit: number }>(
        `/rank/coins${qs({ period, offset, limit })}`,
        { headers: authHeaders() },
    );
}