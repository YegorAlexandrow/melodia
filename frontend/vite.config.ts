import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-прокси: запросы /api идут на бэкенд FastAPI.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
