import { mkdirSync } from "node:fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getStorage } from "./storage";
import { registerRoutes } from "./utils";
import { routes as passportRoutes } from "./routes/passport";
import { routes as forumRoutes } from "./routes/forum";
import { routes as spaceRoutes } from "./routes/space";
import { routes as searchRoutes } from "./routes/search";
import { routes as notificationRoutes } from "./routes/notifications";
import { routes as rankRoutes } from "./routes/rank";
import { routes as oauthRoutes } from "./oauth";

const app = new Hono();

const allowedOrigins = ["https://code.chenify.top"];

app.use(
    cors({
        origin: (origin) => {
            if (!origin) {
                return allowedOrigins[0] ?? "";
            }
            if (allowedOrigins.includes(origin)) {
                return origin;
            }
            return null;
        },
        allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Location"],
        credentials: true,
        maxAge: 86400,
    }),
);

app.notFound(() => new Response("Not Found", { status: 404 }));

registerRoutes(app, {
    ...passportRoutes,
    ...forumRoutes,
    ...spaceRoutes,
    ...searchRoutes,
    ...notificationRoutes,
    ...rankRoutes,
    ...oauthRoutes,
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
