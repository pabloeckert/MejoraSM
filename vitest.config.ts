import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Los tests de página montan React + React Query + Router y bajo carga
    // (CI, o build corriendo en paralelo) un render tarda más de los 5s por
    // default y da un falso rojo — patrón documentado varias veces en
    // CLAUDE.md ("sobrecarga transitoria de la máquina, no reproducible").
    // 15s de margen + 1 reintento: un test que flaquea una vez pasa en el
    // retry, un fallo real falla las dos.
    testTimeout: 15000,
    hookTimeout: 15000,
    retry: 1,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
