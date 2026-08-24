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
        return Response.json({ users, my_rank: me ? await storage.rank.getFollowerRank(me.id) : null, offset, limit });
    },
    "/api/rank/post/points": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        const storage = getStorage();
        const users = await storage.rank.rankUsersByPoints({ offset, limit }, me?.id);
        return Response.json({ users, my_rank: me ? await storage.rank.getPointsRank(me.id) : null, offset, limit });
    },
} satisfies RouteMap;
