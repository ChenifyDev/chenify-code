import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredCoinTransaction, StoredFollow, StoredUser } from "../rows";
import type { CoinPeriod, CoinUser, UserSummary } from "../types";
import type { CoinsRepo } from "../plugin";

const TIP_AMOUNT = 1;
const TIP_REWARD = 0.1;
const DAILY_REWARD = 1;

function summaryOf(user: StoredUser | undefined, fallbackId: number): UserSummary {
    return user
        ? { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at }
        : { id: fallbackId, username: "未知用户", avatar: null, created_at: "" };
}

function localDateKey(now: Date): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function startOfCoinPeriod(period: CoinPeriod, now: Date = new Date()): Date {
    if (period === "total") return new Date(0);
    const d = new Date(now);
    if (period === "week") {
        const day = d.getDay();
        const daysSinceMonday = (day + 6) % 7;
        d.setDate(d.getDate() - daysSinceMonday);
    } else {
        d.setDate(1);
    }
    d.setHours(0, 0, 0, 0);
    return d;
}

function roundBalance(value: number): number {
    return Math.round(value * 10000) / 10000;
}

function balanceOf(rows: StoredCoinTransaction[], userId: number): number {
    return roundBalance(rows.reduce((sum, row) => (row.user_id === userId ? sum + row.amount : sum), 0));
}

export function createCoinsRepo(store: CollectionStore): CoinsRepo {
    return {
        async getBalance(userId) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            return balanceOf(rows, userId);
        },

        async checkIn(userId, now = new Date()) {
            const date = localDateKey(now);
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            const already = rows.some(
                (row) => row.user_id === userId && row.type === "daily" && row.reward_date === date,
            );
            if (already) return { granted: false, balance: balanceOf(rows, userId) };
            await store.insert<StoredCoinTransaction>(C.coinTransactions, {
                user_id: userId,
                post_id: null,
                type: "daily",
                amount: DAILY_REWARD,
                reward_date: date,
                created_at: now.toISOString(),
            });
            const balance = await this.getBalance(userId);
            return { granted: true, balance };
        },

        async listDailyCheckins(userId, limit = 30) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            return rows
                .filter((row) => row.user_id === userId && row.type === "daily" && row.reward_date != null)
                .map((row) => row.reward_date as string)
                .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
                .slice(0, limit);
        },

        async tipPost(userId, postId, postAuthorId) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            const alreadyTipped = rows.some(
                (row) => row.user_id === userId && row.type === "tip_out" && row.post_id === postId,
            );
            if (alreadyTipped) return { ok: false, reason: "already_tipped", balance: balanceOf(rows, userId) };
            const balance = balanceOf(rows, userId);
            if (balance < TIP_AMOUNT) return { ok: false, reason: "insufficient", balance };

            const now = new Date().toISOString();
            await store.insert<StoredCoinTransaction>(C.coinTransactions, {
                user_id: userId,
                post_id: postId,
                type: "tip_out",
                amount: -TIP_AMOUNT,
                reward_date: null,
                created_at: now,
            });
            await store.insert<StoredCoinTransaction>(C.coinTransactions, {
                user_id: postAuthorId,
                post_id: postId,
                type: "tip_in",
                amount: TIP_REWARD,
                reward_date: null,
                created_at: now,
            });
            return { ok: true, balance: await this.getBalance(userId) };
        },

        async hasTipped(userId, postId) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            return rows.some((row) => row.user_id === userId && row.type === "tip_out" && row.post_id === postId);
        },

        async rankCoins(options, viewerId) {
            const { period, offset, limit } = options;
            const [users, ledger, follows] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredCoinTransaction>(C.coinTransactions),
                store.read<StoredFollow>(C.follows),
            ]);
            const start = startOfCoinPeriod(period).getTime();
            const afterStart = (ts: string) => new Date(ts).getTime() >= start;
            const coinsOf = (userId: number) =>
                roundBalance(
                    ledger.reduce(
                        (sum, row) =>
                            row.user_id === userId && row.type === "tip_in" && afterStart(row.created_at)
                                ? sum + row.amount
                                : sum,
                        0,
                    ),
                );
            const ranked = [...users]
                .sort((a, b) => coinsOf(b.id) - coinsOf(a.id) || a.id - b.id)
                .map((user, index) => ({
                    ...summaryOf(user, user.id),
                    email: user.email,
                    coins: coinsOf(user.id),
                    is_following: viewerId
                        ? follows.some((f) => f.follower_id === viewerId && f.following_id === user.id)
                        : false,
                    rank: index + 1,
                }));
            return ranked.slice(offset, offset + limit) as CoinUser[];
        },

        async getCoinRank(userId, period) {
            const [users, ledger] = await Promise.all([
                store.read<StoredUser>(C.users),
                store.read<StoredCoinTransaction>(C.coinTransactions),
            ]);
            const start = startOfCoinPeriod(period).getTime();
            const afterStart = (ts: string) => new Date(ts).getTime() >= start;
            const coinsOf = (uid: number) =>
                roundBalance(
                    ledger.reduce(
                        (sum, row) =>
                            row.user_id === uid && row.type === "tip_in" && afterStart(row.created_at)
                                ? sum + row.amount
                                : sum,
                        0,
                    ),
                );
            const mine = coinsOf(userId);
            return users.filter((u) => coinsOf(u.id) > mine).length + 1;
        },

        async getPostCoinsReceived(postId) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            return roundBalance(
                rows.reduce(
                    (sum, row) => (row.post_id === postId && row.type === "tip_in" ? sum + row.amount : sum),
                    0,
                ),
            );
        },

        async getCoinsReceivedTotal(userId) {
            const rows = await store.read<StoredCoinTransaction>(C.coinTransactions);
            return roundBalance(
                rows.reduce(
                    (sum, row) => (row.user_id === userId && row.type === "tip_in" ? sum + row.amount : sum),
                    0,
                ),
            );
        },
    };
}