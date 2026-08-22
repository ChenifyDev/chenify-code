import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: [
        "../packages/storage/src/db/pg-schema.ts",
        "../packages/storage/src/works/pg-schema.ts",
    ],
    out: "./drizzle-neon",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? "",
    },
    verbose: true,
    strict: true,
});
