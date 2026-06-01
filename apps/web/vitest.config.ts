import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    exclude: ["tests/e2e/**", "node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      include: ["lib/**/*.ts", "lib/**/*.tsx"],
      exclude: [
        "lib/**/*.test.ts",
        "lib/**/*.test.tsx",
        "lib/db/database.types.ts",
        "lib/**/*.d.ts",
      ],
      thresholds: {
        // Global gates for lib/.
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        // Per-module gate: money math is critical -> 100%.
        "lib/pricing/**": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
