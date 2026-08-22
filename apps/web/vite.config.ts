import * as path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// 仓库根目录（含 .env）
const rootDir = path.resolve(__dirname, "../..");
const env = loadEnv("development", rootDir);
const API_PATH = env.VITE_API_PATH;

// https://vite.dev/config/
export default defineConfig({
	envDir: rootDir,
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