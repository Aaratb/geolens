import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const log = [];
page.on("console", (msg) => log.push(`console.${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => log.push(`pageerror: ${err.message}`));

console.log("1. goto landing");
await page.goto("https://geolens.xyz/", { waitUntil: "networkidle" });
console.log("   url:", page.url());

console.log("2. find Sign in link");
const signInLink = page.getByRole("link", { name: "Sign in" });
const signInCount = await signInLink.count();
console.log("   matches:", signInCount);
if (signInCount === 0) {
  console.log("   NO SIGN-IN LINK FOUND ON LANDING");
  await browser.close();
  process.exit(1);
}

const visible = await signInLink.first().isVisible();
const href = await signInLink.first().getAttribute("href");
console.log("   visible:", visible, "href:", href);

console.log("3. click");
await signInLink.first().click();
await page.waitForTimeout(2000);
console.log("   url after click:", page.url());

console.log("4. signin widget present?");
const clerkWidget = await page.locator(".cl-rootBox").count();
console.log("   .cl-rootBox count:", clerkWidget);

console.log("5. console + errors during nav:");
for (const l of log) console.log("  ", l);

await browser.close();
