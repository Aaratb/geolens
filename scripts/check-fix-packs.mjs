import { Pool } from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await pool.query(`
    SELECT fp.id, fp.scan_id, fp.status, fp.error, fp.model, fp.cost_cents,
           fp.requested_by, fp.created_at, fp.updated_at,
           s.hostname, s.status AS scan_status, s.user_id, u.email
    FROM scan_fix_packs fp
    JOIN scans s ON s.id = fp.scan_id
    LEFT JOIN users u ON u.id = s.user_id
    ORDER BY fp.updated_at DESC
    LIMIT 15
  `);
  console.log("Recent fix packs:");
  for (const row of r.rows) {
    const errSnippet = row.error ? ` err="${String(row.error).slice(0, 120)}"` : "";
    const ageS = Math.round((Date.now() - new Date(row.updated_at).getTime()) / 1000);
    console.log(
      `  ${row.scan_id.slice(0, 8)} ${row.hostname.padEnd(20)} status=${row.status.padEnd(10)} model=${row.model ?? "-"} cost=${row.cost_cents ?? "-"}c by=${row.email ?? row.requested_by ?? "anon"} ${ageS}s ago${errSnippet}`,
    );
  }
} finally {
  await pool.end();
}
