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
        const [posts, total] = await Promise.all([
            storage.home.listFollowingPosts(me.id, { offset, limit }),
            storage.home.countFollowingPosts(me.id),
        ]);
        const hasMore = offset + posts.length < total;
        return Response.json({ posts, total, offset, limit, hasMore });
    },
} satisfies RouteMap;
