import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

// Drizzle CLI doesn't load .env.local the way Next.js does; load it manually.
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) {
      process.env[m[1]] = m[2]?.replace(/^["']|["']$/g, "") ?? "";
    }
  }
} catch {
  /* .env.local optional in CI */
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
