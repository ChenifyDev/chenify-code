import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
export default defineConfig({
    schema: ["./src/db/pg-schema.ts"],
    out: "./drizzle-neon",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? "",
    },
    verbose: true,
    strict: true,
});
