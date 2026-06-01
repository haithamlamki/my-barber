import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a build-time guard that throws when bundled for the
      // client. In unit tests it has no runtime meaning, so stub it out.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
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
        // Type-only modules: no runtime code to exercise.
        "lib/**/types.ts",
        // Framework wiring with no business branches: construct a Supabase/
        // next-intl client from already-tested env (lib/supabase/env.ts) plus
        // Next-mandated cookie/SSR plumbing. Exercised end-to-end by the
        // owner-* Playwright journeys; nothing here is unit-testable without
        // mocking the framework itself.
        "lib/supabase/client.ts",
        "lib/supabase/server.ts",
        "lib/i18n/request.ts",
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
        // Per-module gate: availability/slot math drives bookings -> 100%.
        "lib/availability/**": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        // Per-module gate: booking domain (state machine, quote, code) -> 100%.
        "lib/booking/**": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
});
