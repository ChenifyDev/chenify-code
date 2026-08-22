import { serve } from "@hono/node-server";
import app from "./app";

const PORT = Number(process.env.PORT) || 1111;

serve(
    {
        fetch: app.fetch,
        port: PORT,
    },
    (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
    },
);
