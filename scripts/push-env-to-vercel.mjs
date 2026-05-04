/**
 * Reads .env.local and pushes every KEY=value pair to Vercel as production
 * env vars. Idempotent via `vercel env rm` before each `vercel env add`.
 *
 * Run: node scripts/push-env-to-vercel.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SKIP = new Set([
  // Don't push anything that's clearly local-only
]);

const env = readFileSync(".env.local", "utf8");
const pairs = [];
for (const line of env.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  const key = m[1];
  const value = (m[2] ?? "").replace(/^["']|["']$/g, "");
  if (!key || SKIP.has(key)) continue;
  pairs.push({ key, value });
}

// Override NEXT_PUBLIC_SITE_URL for production
const overridden = pairs.map((p) =>
  p.key === "NEXT_PUBLIC_SITE_URL" ? { ...p, value: "https://geolens.xyz" } : p,
);
if (!overridden.find((p) => p.key === "NEXT_PUBLIC_SITE_URL")) {
  overridden.push({ key: "NEXT_PUBLIC_SITE_URL", value: "https://geolens.xyz" });
}

console.log(`Pushing ${overridden.length} env vars to Vercel production...`);

for (const { key, value } of overridden) {
  // Remove if exists (silently)
  spawnSync("vercel", ["env", "rm", key, "production", "--yes"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  // Add fresh
  const add = spawnSync("vercel", ["env", "add", key, "production"], {
    input: value + "\n",
    encoding: "utf8",
  });
  if (add.status === 0) {
    console.log(`  ✓ ${key}`);
  } else {
    console.error(`  ✗ ${key} failed:`, add.stderr.split("\n")[0]);
  }
}

console.log("done.");
