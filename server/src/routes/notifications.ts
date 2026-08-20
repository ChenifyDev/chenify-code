import { getStorage } from "../storage";
import { getAuthUser, jsonError, parsePagination } from "./util";

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/notifications": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            return Response.json(await storage.notifications.listNotifications(me.id, { offset, limit }));
        },
    },

    "/api/notifications/unread-count": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            return Response.json({ count: await storage.notifications.countUnreadNotifications(me.id) });
        },
    },

    "/api/notifications/read": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const body = (await req.json().catch(() => null)) as { ids?: number[] } | null;
            const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => Number.isInteger(id)) : undefined;
            await storage.notifications.markNotificationsRead(me.id, ids);
            return Response.json({ success: true });
        },
    },
};
