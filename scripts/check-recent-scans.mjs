/**
 * Pull the last few scans from production to see what state they actually
 * ended in. Used to verify the Hobby timeout failure mode.
 */
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
    SELECT
      id,
      hostname,
      status,
      stage,
      duration_ms,
      total_pages,
      score_seo,
      score_aeo,
      cost_cents,
      created_at,
      completed_at
    FROM scans
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log(`Recent ${r.rowCount} scans:`);
  for (const s of r.rows) {
    const elapsed = s.completed_at
      ? Math.round((s.completed_at.getTime() - s.created_at.getTime()) / 1000)
      : Math.round((Date.now() - s.created_at.getTime()) / 1000);
    console.log(
      `  ${s.id.slice(0, 8)} ${s.hostname.padEnd(30)} ${s.status.padEnd(10)} stage=${(s.stage ?? "-").padEnd(10)} elapsed=${elapsed}s pages=${s.total_pages ?? "-"} seo=${s.score_seo ?? "-"} aeo=${s.score_aeo ?? "-"}`,
    );
  }

  // Per-stage histogram of failed scans
  const fails = await pool.query(`
    SELECT stage, count(*) as n
    FROM scans
    WHERE status = 'failed' OR (status = 'running' AND created_at < now() - interval '5 minutes')
    GROUP BY stage
    ORDER BY n DESC
  `);
  console.log(`\nFailure distribution:`);
  for (const row of fails.rows) console.log(`  ${row.stage ?? "(null)"}: ${row.n}`);
} finally {
  await pool.end();
}
