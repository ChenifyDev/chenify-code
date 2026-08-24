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
import { routes as worksRoutes } from "./routes/works";
import { routes as rankRoutes } from "./routes/rank";
import { routes as oauthRoutes } from "./oauth";

const app = new Hono();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) ?? [];
app.use(
    cors({
        origin: (origin) => {
            if (!origin) return allowedOrigins[0] ?? "";
            return allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? "");
        },
        allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Location"],
        credentials: allowedOrigins.length > 0,
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
    ...worksRoutes,
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
