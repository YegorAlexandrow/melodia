import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Цель прокси /api: на хосте — localhost:8000, в Docker — http://backend:8000
// (задаётся через VITE_PROXY_TARGET). Polling включаем в контейнере для надёжного
// хот-релоада на любом хосте (VITE_USE_POLLING=1).
const target = process.env.VITE_PROXY_TARGET || "http://localhost:8000";
const usePolling = process.env.VITE_USE_POLLING === "1";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // слушать 0.0.0.0 — чтобы порт был доступен из контейнера
    port: 5173,
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
      },
    },
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
});
