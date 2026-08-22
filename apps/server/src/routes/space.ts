import { getStorage } from "@chenify/storage";
import { getAuthUser, jsonError, parsePagination } from "./util";
import type { RouteMap } from "../utils";

function paramId(req: Request, name: string): number | Response {
    const raw = (req as Request & { params?: Record<string, string> }).params?.[name] ?? "";
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "无效的 ID");
    return id;
}

function isErr(value: number | Response): value is Response {
    return value instanceof Response;
}

export const routes = {
    "/api/users/:id/space": {
        GET: async (req) => {
            const storage = getStorage();
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            const user = await storage.users.getSpaceUser(id);
            if (!user) return jsonError(404, "用户不存在");

            const me = await getAuthUser(req);
            const rawCounts = await storage.users.getSpaceCounts(id);
            const isSelf = me?.id === id;

            const counts = {
                posts: rawCounts.posts,
                favorites: isSelf || user.is_favorites_public ? rawCounts.favorites : null,
                following: isSelf || user.is_follows_public ? rawCounts.following : null,
                followers: isSelf || user.is_follows_public ? rawCounts.followers : null,
            };

            const relation = me
                ? {
                      is_following: await storage.follows.isFollowing(me.id, id),
                      is_followed_by: await storage.follows.isFollowing(id, me.id),
                  }
                : null;

            return Response.json({ user, counts, relation });
        },
    },

    "/api/users/:id/space/posts": {
        GET: async (req) => {
            const storage = getStorage();
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            if (!(await storage.users.userExists(id))) return jsonError(404, "用户不存在");
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const viewer = await getAuthUser(req);
            return Response.json(
                await storage.posts.listUserPosts(id, { offset, limit, viewerId: viewer?.id ?? null }),
            );
        },
    },

    "/api/users/:id/space/favorites": {
        GET: async (req) => {
            const storage = getStorage();
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            const user = await storage.users.getSpaceUser(id);
            if (!user) return jsonError(404, "用户不存在");
            const me = await getAuthUser(req);
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const hidden = me?.id !== id && !user.is_favorites_public;
            if (hidden) return Response.json({ posts: [], hidden: true, offset, limit });
            return Response.json({
                posts: await storage.posts.listUserFavorites(id, { offset, limit, viewerId: me?.id ?? null }),
                hidden: false,
                offset,
                limit,
            });
        },
    },

    "/api/users/:id/space/following": {
        GET: async (req) => {
            const storage = getStorage();
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            const user = await storage.users.getSpaceUser(id);
            if (!user) return jsonError(404, "用户不存在");
            const me = await getAuthUser(req);
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const hidden = me?.id !== id && !user.is_follows_public;
            if (hidden) return Response.json({ users: [], hidden: true, offset, limit });
            return Response.json({
                users: await storage.follows.listFollowing(id, me?.id ?? null, { offset, limit }),
                hidden: false,
                offset,
                limit,
            });
        },
    },

    "/api/users/:id/space/followers": {
        GET: async (req) => {
            const storage = getStorage();
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            const user = await storage.users.getSpaceUser(id);
            if (!user) return jsonError(404, "用户不存在");
            const me = await getAuthUser(req);
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const hidden = me?.id !== id && !user.is_follows_public;
            if (hidden) return Response.json({ users: [], hidden: true, offset, limit });
            return Response.json({
                users: await storage.follows.listFollowers(id, me?.id ?? null, { offset, limit }),
                hidden: false,
                offset,
                limit,
            });
        },
    },
} satisfies RouteMap;
