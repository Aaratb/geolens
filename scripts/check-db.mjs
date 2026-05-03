import { Pool } from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  console.log(`Tables in public schema (${r.rowCount}):`);
  for (const row of r.rows) console.log("  -", row.table_name);
} finally {
  await pool.end();
}
