-- Fix Pack beta persistence. Expansion-only: no existing table writes are
-- affected, and the feature remains disabled unless FIX_PACK_ENABLED=true.

CREATE TABLE IF NOT EXISTS "scan_fix_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_id" uuid NOT NULL,
  "requested_by" text,
  "status" text DEFAULT 'generating' NOT NULL,
  "version" text DEFAULT 'v1' NOT NULL,
  "payload" jsonb,
  "error" text,
  "model" text,
  "cost_cents" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "scan_fix_packs_scan_id_scans_id_fk"
    FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE cascade,
  CONSTRAINT "scan_fix_packs_requested_by_users_id_fk"
    FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE set null,
  CONSTRAINT "scan_fix_packs_status_enum"
    CHECK ("status" IN ('generating', 'completed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "scan_fix_packs_scan_id_uq"
  ON "scan_fix_packs" ("scan_id");

CREATE INDEX IF NOT EXISTS "scan_fix_packs_status_idx"
  ON "scan_fix_packs" ("status");
