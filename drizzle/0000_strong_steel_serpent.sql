CREATE TABLE IF NOT EXISTS "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"anon_id" text,
	"event" text NOT NULL,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_engine_probes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"engine" text NOT NULL,
	"probe_kind" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text,
	"brand_mentioned" boolean,
	"url_cited" boolean,
	"position" text,
	"sentiment" text,
	"accuracy" text,
	"base_score" integer,
	"weighted_score" integer,
	"latency_ms" integer,
	"cost_cents" integer,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"ord" integer NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"why" text NOT NULL,
	"detail" text,
	"fix_hint" text,
	"effort" text,
	"score_impact" integer,
	"is_top3" boolean DEFAULT false NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_pages_crawled" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status_code" integer,
	"bytes" integer,
	"fetch_ms" integer,
	"signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"ip_hash" text NOT NULL,
	"url" text NOT NULL,
	"url_hash" text NOT NULL,
	"hostname" text NOT NULL,
	"brand_name" text,
	"category" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"stage" text,
	"score_seo" integer,
	"score_aeo" integer,
	"score_visibility" integer,
	"score_hygiene" integer,
	"score_citability" integer,
	"citation_rate_pct" integer,
	"sov_pct" integer,
	"total_pages" integer,
	"duration_ms" integer,
	"cost_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "share_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"scan_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"scan_id" uuid,
	"gap_id" uuid,
	"source" text,
	"utm" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_engine_probes" ADD CONSTRAINT "scan_engine_probes_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_pages_crawled" ADD CONSTRAINT "scan_pages_crawled_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_gap_id_scan_findings_id_fk" FOREIGN KEY ("gap_id") REFERENCES "public"."scan_findings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_event_created_idx" ON "events" USING btree ("event","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probes_scan_engine_idx" ON "scan_engine_probes" USING btree ("scan_id","engine","probe_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_scan_ord_idx" ON "scan_findings" USING btree ("scan_id","ord");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_scan_idx" ON "scan_pages_crawled" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_user_created_idx" ON "scans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_url_hash_idx" ON "scans" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_ip_created_idx" ON "scans" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_gap_uq" ON "waitlist_entries" USING btree ("email","gap_id");