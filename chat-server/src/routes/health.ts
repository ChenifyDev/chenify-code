import { Hono } from "hono";

export const routes = new Hono();

routes.get("/health", (c) => {
    return c.json({ ok: true, ts: Date.now() });
});
