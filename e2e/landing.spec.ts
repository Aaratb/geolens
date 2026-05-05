/**
 * Landing-page smoke tests. Read-only — never submits a real scan against
 * production. Verifies the editorial layout we shipped is intact.
 */
import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("renders editorial masthead, hero, submit form", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GEOlens/);

    // Editorial eyebrow
    await expect(page.getByText("Vol. 1 · Issue 01 · Beta")).toBeVisible();

    // Wordmark
    await expect(page.getByRole("heading", { level: 1, name: /misses your brand/ })).toBeVisible();

    // Submit form
    const input = page.getByPlaceholder("yourbrand.com");
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: /Diagnose my site/ })).toBeVisible();
  });

  test("specimen audit shows three numbered findings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/#GL-01/)).toBeVisible();
    await expect(page.getByText(/#GL-02/)).toBeVisible();
    await expect(page.getByText(/#GL-03/)).toBeVisible();
  });

  test("comparison row vs incumbents is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Profound")).toBeVisible();
    await expect(page.getByText("Ahrefs Brand Radar")).toBeVisible();
    await expect(page.getByText("HubSpot AEO Grader")).toBeVisible();
  });

  test("methodology link routes to /methodology", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Methodology/i }).first().click();
    await expect(page).toHaveURL(/\/methodology$/);
    await expect(page.getByRole("heading", { name: /How we verify/i })).toBeVisible();
  });

  test("emits Organization JSON-LD (eat our own dogfood)", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator("script[type='application/ld+json']").first().textContent();
    expect(ld).toBeTruthy();
    expect(ld!).toContain("Organization");
    expect(ld!).toContain("GEOlens");
  });

  test("HTTP security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
