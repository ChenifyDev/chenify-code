import { mkdirSync } from "node:fs";
import { Hono } from "hono";
import { getStorage } from "./storage";
import { registerRoutes } from "./utils";
import { routes as passportRoutes } from "./routes/passport";
import { routes as forumRoutes } from "./routes/forum";
import { routes as spaceRoutes } from "./routes/space";
import { routes as searchRoutes } from "./routes/search";
import { routes as notificationRoutes } from "./routes/notifications";
import { routes as worksRoutes } from "./routes/works";
import { routes as rankRoutes } from "./routes/rank";

const app = new Hono();

app.notFound(() => new Response("Not Found", { status: 404 }));

registerRoutes(app, {
    ...passportRoutes,
    ...forumRoutes,
    ...spaceRoutes,
    ...searchRoutes,
    ...notificationRoutes,
    ...worksRoutes,
    ...rankRoutes,
});

const storage = getStorage();

if (storage.name === "sqlite") {
    mkdirSync("./uploads", { recursive: true });
    app.get("/uploads/*", (c) => {
        const path = decodeURIComponent(new URL(c.req.url).pathname.replace(/^\/uploads\//, ""));
        if (!path || path.includes("..") || path.includes("/") || path.includes("\\")) {
            return new Response("Not Found", { status: 404 });
        }
        return new Response(Bun.file(`./uploads/${path}`));
    });
}

export default app;
export { app };
