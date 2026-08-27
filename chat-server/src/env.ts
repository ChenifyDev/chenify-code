import { join } from "node:path";

const driver = (process.env.STORAGE_DRIVER ?? "sqlite") as "sqlite" | "neon";

const env = {
    STORAGE_DRIVER: driver,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CHAT_PORT: Number(process.env.CHAT_PORT ?? 8081),
    JWT_SECRET: process.env.JWT_SECRET ?? "chenify-dev-secret",
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,https://hub.chenify.top").split(","),
    CHAT_DB_PATH: driver === "sqlite" ? join(import.meta.dir, process.env.CHAT_DB_PATH ?? "./chat.db") : "",
    ACCOUNT_DB_PATH: driver === "sqlite" ? join(import.meta.dir, process.env.ACCOUNT_DB_PATH ?? "../server/app.db") : "",
};

export default env;
