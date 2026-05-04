-- Phase 7 review (Tier 3): defense-in-depth integrity constraints + an
-- operational index on scans(status) for "show me all running scans" ops queries.

-- Score columns are 0-100. Reject negative or absurd values at the DB layer.
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_score_seo_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_score_seo_range"
  CHECK ("score_seo" IS NULL OR ("score_seo" >= 0 AND "score_seo" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_score_aeo_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_score_aeo_range"
  CHECK ("score_aeo" IS NULL OR ("score_aeo" >= 0 AND "score_aeo" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_score_visibility_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_score_visibility_range"
  CHECK ("score_visibility" IS NULL OR ("score_visibility" >= 0 AND "score_visibility" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_score_hygiene_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_score_hygiene_range"
  CHECK ("score_hygiene" IS NULL OR ("score_hygiene" >= 0 AND "score_hygiene" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_score_citability_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_score_citability_range"
  CHECK ("score_citability" IS NULL OR ("score_citability" >= 0 AND "score_citability" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_citation_rate_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_citation_rate_range"
  CHECK ("citation_rate_pct" IS NULL OR ("citation_rate_pct" >= 0 AND "citation_rate_pct" <= 100));

ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_sov_range";
ALTER TABLE "scans" ADD CONSTRAINT "scans_sov_range"
  CHECK ("sov_pct" IS NULL OR ("sov_pct" >= 0 AND "sov_pct" <= 100));

-- Status enum guarded at the DB layer (defense in depth — Drizzle enforces it
-- at the type layer too).
ALTER TABLE "scans" DROP CONSTRAINT IF EXISTS "scans_status_enum";
ALTER TABLE "scans" ADD CONSTRAINT "scans_status_enum"
  CHECK ("status" IN ('queued', 'running', 'completed', 'failed'));

-- Operational index for ad-hoc queries ("any scans stuck in running for >5min?")
-- Partial because the active set is tiny (running) vs the table (completed).
CREATE INDEX IF NOT EXISTS "scans_active_status_idx"
  ON "scans" ("status", "created_at")
  WHERE "status" IN ('queued', 'running');
