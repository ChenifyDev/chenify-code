import { Hono } from "hono";
import { cors } from "hono/cors";
import env from "./env";
import { routes as healthRoutes } from "./routes/health";
import { routes as keysRoutes } from "./routes/keys";
import { routes as historyRoutes } from "./routes/history";

const app = new Hono();

app.use(
    "*",
    cors({
        origin: (origin) => {
            if (!origin) return env.ALLOWED_ORIGINS[0] ?? "";
            return env.ALLOWED_ORIGINS.includes(origin) ? origin : null;
        },
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 86400,
    }),
);

app.notFound(() => new Response("Not Found", { status: 404 }));

app.route("/", healthRoutes);
app.route("/", keysRoutes);
app.route("/", historyRoutes);

export default app;
