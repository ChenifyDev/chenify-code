import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/works/schema.ts",
    out: "./drizzle-works",
    dialect: "sqlite",
    dbCredentials: {
        url: "./works.db",
    },
    verbose: true,
    strict: true,
});