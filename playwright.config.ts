import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for GEOlens E2E smoke tests.
 *
 * Two run modes:
 *   - `npm run e2e`        runs against PLAYWRIGHT_BASE_URL (defaults to local
 *                          dev server on http://localhost:3000)
 *   - `npm run e2e:prod`   runs against https://geolens.xyz
 *
 * Tests are intentionally read-only smoke checks — no auth required, no
 * scan creation, no data writes against production. They verify the surface
 * we shipped renders without errors.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Don't auto-start a webserver; tests assume one is running OR they target
  // production via PLAYWRIGHT_BASE_URL.
});
