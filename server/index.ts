import { mkdirSync } from "node:fs";
import { routes as passportRoutes } from "./src/routes/passport";

mkdirSync("./uploads", { recursive: true });

Bun.serve({
    port: 8080,
    routes: {
        ...passportRoutes,
        "/uploads/*": (req) => {
            const path = decodeURIComponent(new URL(req.url).pathname.replace(/^\/uploads\//, ""));
            if (!path || path.includes("..") || path.includes("/") || path.includes("\\")) {
                return new Response("Not Found", { status: 404 });
            }
            return new Response(Bun.file(`./uploads/${path}`));
        },
    },
    fetch(_req) {
        return new Response("Not Found", { status: 404 });
    },
});
