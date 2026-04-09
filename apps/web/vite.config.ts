import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()].filter(Boolean),
  define: {
    __BUNDLED_DEV__: mode === "development",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@servx/types": path.resolve(__dirname, "../../packages/types/index.ts"),
    },
  },
}));
