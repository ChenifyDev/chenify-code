import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "node:path";

const API_PATH = loadEnv("development", process.cwd()).VITE_API_PATH;
const CHAT_PATH = loadEnv("development", process.cwd()).VITE_CHAT_PATH || "http://localhost:8081";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: API_PATH,
                changeOrigin: true,
            },
            "/uploads": {
                target: API_PATH,
                changeOrigin: true,
            },
            "/chat-api": {
                target: CHAT_PATH,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/chat-api/, ""),
            },
        },
    },
});
