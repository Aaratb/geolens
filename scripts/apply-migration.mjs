/**
 * Apply a migration file to Neon directly. Used when drizzle-kit push hangs on
 * an interactive prompt — usually for schema additions where the prompt is
 * spurious anyway.
 */
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { argv } from "node:process";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const file = argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const stmt of statements) {
    console.log("→", stmt.split("\n")[0]?.slice(0, 80));
    await pool.query(stmt);
  }
  console.log("✓ migration applied");
} finally {
  await pool.end();
}
