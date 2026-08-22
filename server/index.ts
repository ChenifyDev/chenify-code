import { app } from "./src/app";

if (import.meta.main) {
    Bun.serve({
        port: 8080,
        fetch: app.fetch,
    });
}
