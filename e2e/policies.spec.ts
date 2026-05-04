/**
 * Methodology / privacy / terms smoke tests. Each page must render the
 * canonical content we shipped. If marketing/legal content drifts later
 * these are the canary.
 */
import { expect, test } from "@playwright/test";

test("methodology page shows scoring formula", async ({ page }) => {
  await page.goto("/methodology");
  await expect(page.getByRole("heading", { name: /How we score what AI sees/i })).toBeVisible();
  await expect(page.getByText(/Performance · 25%/)).toBeVisible();
  await expect(page.getByText(/Engine Visibility · 60%/)).toBeVisible();
  // The multiplier code-block should be present
  await expect(page.getByText(/probe_score = base/)).toBeVisible();
});

test("privacy page is GDPR-compliant", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /Privacy notice/i })).toBeVisible();
  // Use heading roles to avoid strict-mode collisions with body prose.
  await expect(page.getByRole("heading", { name: /Lawful basis \(GDPR Art\. 6\)/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Your rights$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Subprocessors/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /AI-generated content/i })).toBeVisible();
});

test("terms page renders", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: /Terms of service/i })).toBeVisible();
  await expect(page.getByText(/Use of GEOlens/i)).toBeVisible();
  await expect(page.getByText(/Liability/i)).toBeVisible();
});

test("sitemap is served", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("https://");
});

test("robots.txt is served and covers AI crawlers", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  for (const ua of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    expect(body).toContain(ua);
  }
});

test("llms.txt is served per llmstxt.org spec", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  // H1 is required at top
  expect(body.split("\n")[0]).toMatch(/^# /);
  expect(body).toContain("GEOlens");
});
