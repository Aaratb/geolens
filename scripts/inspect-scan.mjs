/**
 * Pull scan_events for a specific scan id to see exactly where it failed.
 */
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const scanId = process.argv[2];
if (!scanId) {
  console.error("usage: node scripts/inspect-scan.mjs <scan-id>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const meta = await pool.query("SELECT * FROM scans WHERE id = $1", [scanId]);
  console.log("Scan:", meta.rows[0]);
  console.log();

  const events = await pool.query(
    "SELECT id, seq, event_type, payload, created_at FROM scan_events WHERE scan_id = $1 ORDER BY id",
    [scanId],
  );
  console.log(`Events (${events.rowCount}):`);
  for (const e of events.rows) {
    const elapsed = Math.round((e.created_at.getTime() - meta.rows[0].created_at.getTime()) / 1000);
    const summary =
      e.event_type === "scan.failed"
        ? ` reason=${e.payload?.reason} stage=${e.payload?.stage}`
        : e.event_type === "crawl.page.fetched"
          ? ` ${e.payload?.url} ${e.payload?.statusCode}`
          : "";
    console.log(`  +${elapsed}s  ${e.event_type}${summary}`);
  }
} finally {
  await pool.end();
}
