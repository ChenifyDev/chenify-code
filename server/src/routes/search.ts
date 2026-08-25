import { getStorage } from "../storage";
import { getAuthUser, jsonError, parsePagination } from "./util";
import type { RouteMap } from "../utils";

type SearchType = "posts" | "users";
type SortType = "hot" | "latest";

export const routes = {
    "/api/search": async (req) => {
        const url = new URL(req.url);
        const keyword = url.searchParams.get("keyword");
        const sort = (url.searchParams.get("sort") || "hot") as SortType;
        const type = (url.searchParams.get("type") || "posts") as SearchType;
        const { offset, limit } = parsePagination(url);
        if (!keyword) return jsonError(400, "Invalid keyword");
        const storage = getStorage();
        if (type === "posts") {
            const items = await storage.posts.searchPosts({ offset, limit, sort, keyword });
            const total = (await storage.posts.searchPosts({ offset: 0, limit: Number.MAX_SAFE_INTEGER, sort, keyword })).length;
            return Response.json({ items, total, offset, limit, hasMore: offset + items.length < total });
        } else {
            const me = await getAuthUser(req);
            const items = await storage.users.searchUsers({ offset, limit, keyword }, me?.id ?? null);
            const total = (
                await storage.users.searchUsers({ offset: 0, limit: Number.MAX_SAFE_INTEGER, keyword }, me?.id ?? null)
            ).length;
            return Response.json({ items, total, offset, limit, hasMore: offset + items.length < total });
        }
    },
} satisfies RouteMap;
