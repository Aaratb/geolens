import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Playwright lives in e2e/ and uses its own runner; exclude here so the
    // unit-test command doesn't try to load .spec.ts files that import
    // @playwright/test.
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/*.config.*", "**/node_modules/**", "**/e2e/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
