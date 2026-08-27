import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/pg-schema.ts",
    out: "./drizzle-neon",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? "",
    },
    verbose: true,
    strict: true,
});
