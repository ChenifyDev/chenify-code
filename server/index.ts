import { mkdirSync } from "node:fs";
import { routes as passportRoutes } from "./src/routes/passport";
import { routes as forumRoutes } from "./src/routes/forum";
import { routes as spaceRoutes } from "./src/routes/space";
import { routes as searchRoutes } from "./src/routes/search";
import { routes as notificationRoutes } from "./src/routes/notifications";
import { routes as worksRoutes } from "./src/routes/works";
import { routes as rankRoutes } from "./src/routes/rank";
import { getStorage } from "./src/storage";

const storage = getStorage();

const routes: Bun.Serve.Routes<any, any> = {
    ...passportRoutes,
    ...forumRoutes,
    ...spaceRoutes,
    ...searchRoutes,
    ...notificationRoutes,
    ...worksRoutes,
    ...rankRoutes,
};

if (storage.name === "sqlite") {
    mkdirSync("./uploads", { recursive: true });
    routes["/uploads/*"] = (req) => {
        const path = decodeURIComponent(new URL(req.url).pathname.replace(/^\/uploads\//, ""));
        if (!path || path.includes("..") || path.includes("/") || path.includes("\\")) {
            return new Response("Not Found", { status: 404 });
        }
        return new Response(Bun.file(`./uploads/${path}`));
    };
}

Bun.serve({
    port: 8080,
    routes,
    fetch(_req) {
        return new Response("Not Found", { status: 404 });
    },
});
