import { getStorage } from "../storage";
import { getAuthUser, parsePagination } from "./util";
import type { RouteMap } from "../utils";

export const routes = {
    "/api/rank/followers": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        const storage = getStorage();
        const users = await storage.rank.rankUsersByFollowers({ offset, limit }, me?.id);
        const total = await storage.users.countUsers();
        return Response.json({
            items: users,
            total,
            hasMore: offset + users.length < total,
            my_rank: me ? await storage.rank.getFollowerRank(me.id) : null,
            offset,
            limit,
        });
    },
    "/api/rank/post/points": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        const storage = getStorage();
        const users = await storage.rank.rankUsersByPoints({ offset, limit }, me?.id);
        const total = await storage.users.countUsers();
        return Response.json({
            items: users,
            total,
            hasMore: offset + users.length < total,
            my_rank: me ? await storage.rank.getPointsRank(me.id) : null,
            offset,
            limit,
        });
    },
    "/api/rank/coins": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        const period = url.searchParams.get("period");
        const parsed =
            period === "week" || period === "month" || period === "total"
                ? period
                : "week";
        const storage = getStorage();
        const items = await storage.coins.rankCoins({ period: parsed, offset, limit }, me?.id);
        const total = await storage.users.countUsers();
        return Response.json({
            items,
            total,
            hasMore: offset + items.length < total,
            my_rank: me ? await storage.coins.getCoinRank(me.id, parsed) : null,
            offset,
            limit,
        });
    },
} satisfies RouteMap;
