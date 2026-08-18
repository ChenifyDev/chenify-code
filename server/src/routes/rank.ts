import { getAuthUser, jsonError, parsePagination } from "./util.ts";
import { getFollowerRank, getPointsRank, rankUsersByFollowers, rankUsersByPoints } from "../db/rank.ts";

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/rank/followers": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        if (!me) return jsonError(401, "Unauthorized");
        const users = rankUsersByFollowers(me.id, { offset, limit });
        return Response.json({ users, my_rank: getFollowerRank(me.id), offset, limit });
    },
    "/api/rank/post/points": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        const { offset, limit } = parsePagination(url);
        if (!me) return jsonError(401, "Unauthorized");
        const users = rankUsersByPoints(me.id, { offset, limit });
        return Response.json({ users, my_rank: getPointsRank(me.id), offset, limit });
    },
};
