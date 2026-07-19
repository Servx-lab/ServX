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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // 3D / WebGL — largest chunk, only loaded on 3D pages
          if (id.includes("three") || id.includes("@react-three")) {
            return "vendor-three";
          }
          // Charting / data-viz (recharts pulls in a lot of d3)
          if (id.includes("recharts") || id.includes("d3-") || id.includes("/d3/")) {
            return "vendor-charts";
          }
          // Supabase auth + realtime client
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          // All Radix UI headless primitives
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          // Animation engine
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          // Diagram / flow canvas
          if (id.includes("@xyflow/react")) {
            return "vendor-xyflow";
          }
          // Lucide SVG icons
          if (id.includes("lucide-react")) {
            return "vendor-lucide";
          }
          // react-icons (very large — isolate so it's only loaded when needed)
          if (id.includes("react-icons")) {
            return "vendor-icons";
          }
          // TanStack Query (async state management)
          if (id.includes("@tanstack")) {
            return "vendor-tanstack";
          }
          // Everything else (React, router, etc.) is handled automatically by Vite.
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@servx/types": path.resolve(__dirname, "../../packages/types/index.ts"),
    },
    dedupe: ["three", "@react-three/fiber", "@react-three/drei"],
  },
}));
