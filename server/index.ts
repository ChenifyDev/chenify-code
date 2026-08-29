import dotenv from "dotenv";

// 运行时显式加载环境变量，保证 JWT_SECRET / DATABASE_URL / STORAGE_DRIVER 等
// 在所有实例、冷启动之间保持一致（平台已注入的环境变量优先）。
// 必须在 import app 之前执行，因为 jwt.ts 等模块在加载时就读取 process.env。
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile, override: false });

if (import.meta.main) {
    const { app } = await import("./src/app");
    Bun.serve({
        port: 8080,
        fetch: app.fetch,
    });
}
