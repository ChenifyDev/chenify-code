import { getAuthUser, jsonError, parsePagination } from "./util.ts";
import { searchPosts, searchUsers } from "../db";

type SearchType = "posts" | "users";
type SortType = "hot" | "latest";

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/search": async (req) => {
        const url = new URL(req.url);
        const keyword = url.searchParams.get("keyword");
        const sort = (url.searchParams.get("sort") || "hot") as SortType;
        const type = (url.searchParams.get("type") || "posts") as SearchType;
        const { offset, limit } = parsePagination(url);
        if (!keyword) return jsonError(400, "Invalid keyword");
        if (type === "posts") {
            const data = await searchPosts({ offset, limit, sort, keyword });
            return Response.json(data);
        } else {
            const me = await getAuthUser(req);
            const data = await searchUsers({ offset, limit, keyword }, me?.id || null);
            return Response.json(data);
        }
    },
};
