import { Pool } from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const scanId = process.argv[2];
if (!scanId) {
  console.error("usage: node scripts/delete-fix-pack.mjs <scanId>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await pool.query(
    "DELETE FROM scan_fix_packs WHERE scan_id = $1 RETURNING id, status",
    [scanId],
  );
  console.log("deleted:", r.rows);
} finally {
  await pool.end();
}
