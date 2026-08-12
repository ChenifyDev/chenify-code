import { parsePagination } from "./util.ts";
import { searchPosts, searchUsers } from "../db";

type SearchType = "posts" | "works" | "authors";
type SortType = "hot" | "latest";

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/search": async (req) => {
        const url = new URL(req.url);
        const keyword = url.searchParams.get("keyword");
        const sort = (url.searchParams.get("sort") || "hot") as SortType;
        const type = (url.searchParams.get("type") || "posts") as SearchType;
        const { offset, limit } = parsePagination(url);
        if (!keyword) return new Response("Invalid keyword");
        if (type === "posts") {
            const data = await searchPosts({ offset, limit, sort, keyword });
            return Response.json(data);
        } else if (type === "works") {
        } else {
            const data = await searchUsers({ offset, limit, keyword });
            return Response.json(data);
        }
    },
};
