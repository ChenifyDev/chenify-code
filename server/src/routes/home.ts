import { getAuthUser, jsonError, parsePagination } from "./util.ts";
import { getStorage } from "../storage";
import type { RouteMap } from "../utils";

export const routes = {
    "/api/home/following": async (req) => {
        const url = new URL(req.url);
        const me = await getAuthUser(req);
        if (!me) return jsonError(401, "Unauthorized");
        const { offset, limit } = parsePagination(url);
        const storage = getStorage();
        const posts = await storage.home.listFollowingPosts(me.id, { offset, limit });
        return Response.json({ posts, offset, limit });
    },
} satisfies RouteMap;
