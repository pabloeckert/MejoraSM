import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// base: "/" en local (npm run dev). En el deploy a GitHub Pages
// (deploy-site.yml) se pisa con VITE_BASE_PATH=/app/, porque el EDA convive
// con hub/ (raíz) y dashboard/ en el mismo sitio, bajo el dominio propio
// mejorasm.mejoraok.com (ver CLAUDE.md → Deploy). Vercel/Hostinger nunca
// fueron destino real — no asumir eso.
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
