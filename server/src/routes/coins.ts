import { getStorage } from "../storage";
import { getAuthUser, jsonError } from "./util";
import type { RouteMap } from "../utils";

export const routes = {
    "/api/coins/me": async (req) => {
        const storage = getStorage();
        const me = await getAuthUser(req);
        if (!me) return jsonError(401, "请先登录");
        const balance = await storage.coins.getBalance(me.id);
        return Response.json({ balance });
    },

    "/api/coins/checkin/status": async (req) => {
        const storage = getStorage();
        const me = await getAuthUser(req);
        if (!me) return jsonError(401, "请先登录");
        const [balance, days] = await Promise.all([
            storage.coins.getBalance(me.id),
            storage.coins.listDailyCheckins(me.id),
        ]);
        const today = localDateKey(new Date());
        return Response.json({
            checked_today: days.includes(today),
            balance,
            days,
            total_days: days.length,
        });
    },

    "/api/coins/checkin": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            return Response.json(await storage.coins.checkIn(me.id));
        },
    },
} satisfies RouteMap;

function localDateKey(now: Date): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}