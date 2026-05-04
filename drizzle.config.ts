import { defineConfig } from "drizzle-kit";
import { config as dotenvConfig } from "dotenv";

// Drizzle CLI doesn't load .env.local the way Next.js does; do it via dotenv
// so we get correct handling of quoted values and = inside connection strings.
// (Phase 7 review: S-LOW-3)
dotenvConfig({ path: ".env.local", override: false });

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
