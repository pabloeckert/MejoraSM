import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// base: "/" para Vercel/Hostinger (raíz del dominio). En el deploy a GitHub
// Pages (deploy-eda.yml) se pisa con VITE_BASE_PATH=/MejoraSM/app/, porque
// convive con hub/ y dashboard/ en el mismo sitio (ver CLAUDE.md).
// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-select", "@radix-ui/react-toast"],
          "chart-vendor": ["recharts"],
          "query-vendor": ["@tanstack/react-query"],
        },
      },
    },
  },
});
