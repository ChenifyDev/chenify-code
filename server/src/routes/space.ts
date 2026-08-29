import { getStorage } from "../storage";
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
                coins: await storage.coins.getCoinsReceivedTotal(id),
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

    "/api/users/:id/space/coin": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const id = paramId(req, "id");
            if (isErr(id)) return id;
            if (me.id === id) return jsonError(400, "不能给自己投币");
            if (!(await storage.users.userExists(id))) return jsonError(404, "用户不存在");
            let amount: number;
            try {
                const body = (await req.json()) as { amount?: unknown };
                amount = Number(body.amount);
            } catch {
                return jsonError(400, "无效的投币数量");
            }
            const result = await storage.coins.tipUser(me.id, id, amount);
            if (!result.ok) {
                if (result.reason === "invalid_amount") return jsonError(400, "投币数量需为 1-50 的整数");
                if (result.reason === "self_tip") return jsonError(400, "不能给自己投币");
                if (result.reason === "already_tipped") return jsonError(400, "半个月内已给该用户投过币");
                if (result.reason === "insufficient") return jsonError(400, "硬币不足，无法投币");
                return jsonError(400, "投币失败");
            }
            if (id !== me.id) {
                try {
                    await storage.notifications.createNotification({
                        userId: id,
                        actorId: me.id,
                        type: "user_tip",
                        postId: null,
                        data: JSON.stringify({ amount: result.recipient_delta }),
                    });
                } catch (err) {
                    console.error("create user tip notification failed", err);
                }
            }
            const coins_received = await storage.coins.getCoinsReceivedTotal(id);
            return Response.json({ success: true, balance: result.balance, coins_received });
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
            const [items, total] = await Promise.all([
                storage.posts.listUserPosts(id, { offset, limit, viewerId: viewer?.id ?? null }),
                storage.posts.countUserPosts(id),
            ]);
            return Response.json({ items, total, offset, limit, hasMore: offset + items.length < total });
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
            if (hidden) return Response.json({ items: [], total: 0, hidden: true, offset, limit, hasMore: false });
            const items = await storage.posts.listUserFavorites(id, { offset, limit, viewerId: me?.id ?? null });
            const total = await storage.posts.countUserFavorites(id);
            return Response.json({ items, total, hidden: false, offset, limit, hasMore: offset + items.length < total });
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
            if (hidden) return Response.json({ items: [], total: 0, hidden: true, offset, limit, hasMore: false });
            const items = await storage.follows.listFollowing(id, me?.id ?? null, { offset, limit });
            const total = await storage.follows.countFollowing(id);
            return Response.json({ items, total, hidden: false, offset, limit, hasMore: offset + items.length < total });
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
            if (hidden) return Response.json({ items: [], total: 0, hidden: true, offset, limit, hasMore: false });
            const items = await storage.follows.listFollowers(id, me?.id ?? null, { offset, limit });
            const total = await storage.follows.countFollowers(id);
            return Response.json({ items, total, hidden: false, offset, limit, hasMore: offset + items.length < total });
        },
    },
} satisfies RouteMap;
