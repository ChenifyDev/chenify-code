import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "node:path";

const API_PATH = loadEnv("development", process.cwd()).VITE_API_PATH;
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
        },
    },
});
