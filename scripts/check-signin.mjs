/**
 * Headless render of /sign-in to see what's actually there after hydration.
 */
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleMessages = [];
const errors = [];
page.on("console", (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => errors.push(err.message));
page.on("requestfailed", (req) =>
  errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`),
);

await page.goto("https://geolens.xyz/sign-in", { waitUntil: "networkidle", timeout: 20000 });
// Give Clerk a moment to render
await page.waitForTimeout(2000);

const result = {
  url: page.url(),
  clerkSignInVisible: await page.locator('[data-clerk-component="SignIn"]').count(),
  clerkRootBox: await page.locator(".cl-rootBox").count(),
  emailInput: await page.locator('input[name="identifier"]').count(),
  buttons: await page.locator("button").count(),
  forms: await page.locator("form").count(),
  errors,
  console: consoleMessages.filter(
    (m) => m.startsWith("error:") || m.startsWith("warning:") || m.toLowerCase().includes("clerk"),
  ),
};

console.log(JSON.stringify(result, null, 2));
await browser.close();
