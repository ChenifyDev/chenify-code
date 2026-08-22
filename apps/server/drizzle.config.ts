import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "../packages/storage/src/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
        url: "./app.db",
    },
    verbose: true,
    strict: true,
});
