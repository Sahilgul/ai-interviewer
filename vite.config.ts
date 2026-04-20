import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:8000";
  const devPort = Number(env.VITE_DEV_PORT) || 5173;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: devPort,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
