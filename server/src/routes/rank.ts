import { getStorage } from "../storage";
import { getAuthUser, jsonError, parsePagination } from "./util";
import type { RouteMap } from "../utils";

export const routes: RouteMap = {
    "/api/rank/followers": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        if (!me) return jsonError(401, "Unauthorized");
        const storage = getStorage();
        const users = await storage.rank.rankUsersByFollowers(me.id, { offset, limit });
        return Response.json({ users, my_rank: await storage.rank.getFollowerRank(me.id), offset, limit });
    },
    "/api/rank/post/points": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        if (!me) return jsonError(401, "Unauthorized");
        const storage = getStorage();
        const users = await storage.rank.rankUsersByPoints(me.id, { offset, limit });
        return Response.json({ users, my_rank: await storage.rank.getPointsRank(me.id), offset, limit });
    },
};
