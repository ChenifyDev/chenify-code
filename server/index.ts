import { mkdirSync } from "node:fs";
import { routes as passportRoutes } from "./src/routes/passport";
import { routes as forumRoutes } from "./src/routes/forum";
import { routes as spaceRoutes } from "./src/routes/space";

mkdirSync("./uploads", { recursive: true });

Bun.serve({
    port: 8080,
    routes: {
        ...passportRoutes,
        ...forumRoutes,
        ...spaceRoutes,
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
