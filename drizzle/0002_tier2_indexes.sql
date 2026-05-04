-- Phase 7 review Tier 2 indexes — DB-H-1, DB-H-3.

-- DB-H-1: waitlist UNIQUE(email, gap_id) doesn't prevent duplicate
-- general-waitlist signups when gap_id IS NULL because Postgres treats NULLs
-- as distinct in UNIQUE indexes. Add a partial unique index for the NULL case.
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_general_uq"
  ON "waitlist_entries" ("email")
  WHERE "gap_id" IS NULL;

-- DB-H-3: missing FK indexes on share_tokens(scan_id) and waitlist_entries
-- (scan_id, gap_id). Without these, cascade DELETE on a scan does a sequential
-- scan over each child table — O(table_size) per delete.
CREATE INDEX IF NOT EXISTS "share_tokens_scan_id_idx"
  ON "share_tokens" ("scan_id");

CREATE INDEX IF NOT EXISTS "waitlist_scan_id_idx"
  ON "waitlist_entries" ("scan_id");

CREATE INDEX IF NOT EXISTS "waitlist_gap_id_idx"
  ON "waitlist_entries" ("gap_id");

-- Partial index for the cleanup cron's WHERE clause.
CREATE INDEX IF NOT EXISTS "share_tokens_expires_at_idx"
  ON "share_tokens" ("expires_at")
  WHERE "expires_at" IS NOT NULL;
