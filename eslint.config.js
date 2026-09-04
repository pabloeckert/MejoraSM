import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // supabase/functions/** son Deno (Deno.serve, imports npm:/jsr:, sin este
  // tsconfig) — este ESLint es la config del frontend browser/React y sobre
  // esos archivos solo genera falsos positivos. Deno tiene su propio lint.
  { ignores: ["dist", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Prendido 2026-09-04 (pase de limpieza): estaba en "off", así que un
      // import muerto no lo cachaba nadie. Con "^_" ignorado para el caso
      // deliberado (args de callbacks que no se usan).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // src/components/ui/** son primitivos shadcn sin modificar — el patrón de
    // exportar el componente + su objeto de variantes (cva) desde el mismo
    // archivo es la convención oficial de shadcn, no un descuido. El warning
    // de react-refresh ahí es ruido; el resto de las reglas sí aplican.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
