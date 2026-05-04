/**
 * POST /api/webhooks/clerk
 *
 * Receives user lifecycle events from Clerk and mirrors them into our
 * local `users` table. Required because:
 *   - share_tokens.created_by has a FK to users(id), so anyone creating a
 *     share link must exist locally first.
 *   - We want to be able to delete a user's data when they delete their
 *     account (GDPR right to erasure).
 *
 * Verifies the Svix signature using CLERK_WEBHOOK_SIGNING_SECRET. Runs the
 * matching INSERT/UPDATE/DELETE in a single transaction.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { track } from "@/lib/telemetry/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClerkUserPayload {
  id: string;
  email_addresses?: Array<{ id?: string; email_address?: string }>;
  primary_email_address_id?: string | null;
}

interface ClerkEvent {
  type: "user.created" | "user.updated" | "user.deleted" | string;
  data: ClerkUserPayload;
}

function pickPrimaryEmail(p: ClerkUserPayload): string | null {
  if (!p.email_addresses?.length) return null;
  const primary =
    (p.primary_email_address_id &&
      p.email_addresses.find((e) => e.id === p.primary_email_address_id)) ||
    p.email_addresses[0];
  return primary?.email_address ?? null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET not set");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  // Svix verification: requires svix-id, svix-timestamp, svix-signature
  // headers + the raw body. Re-read the body as text so the signature
  // verification sees the exact bytes Clerk signed.
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  if (!headers["svix-id"] || !headers["svix-timestamp"] || !headers["svix-signature"]) {
    return NextResponse.json({ error: "missing_signature_headers" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: ClerkEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, headers) as ClerkEvent;
  } catch (err) {
    console.warn("[clerk-webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        const email = pickPrimaryEmail(event.data);
        if (!email) {
          // Insert with sentinel; Clerk has at least one verified email at
          // sign-up but extremely rare edge cases (admin-imported user with
          // no email yet) shouldn't crash us.
          await db
            .insert(users)
            .values({ id: event.data.id, email: `${event.data.id}@unknown.local` })
            .onConflictDoNothing();
        } else {
          await db
            .insert(users)
            .values({ id: event.data.id, email })
            .onConflictDoNothing();
        }
        track({ event: "signin.completed", userId: event.data.id, props: { source: "clerk-webhook" } });
        break;
      }
      case "user.updated": {
        const email = pickPrimaryEmail(event.data);
        if (email) {
          await db.update(users).set({ email }).where(eq(users.id, event.data.id));
        }
        break;
      }
      case "user.deleted": {
        // Cascade is handled by FKs (scans cascade-set-null for user_id;
        // share_tokens cascade-delete; waitlist_entries set-null).
        await db.delete(users).where(eq(users.id, event.data.id));
        break;
      }
      default:
        // Other events (org.*, session.*) we don't care about yet.
        break;
    }
  } catch (err) {
    console.error("[clerk-webhook] db write failed", { eventType: event.type, err });
    // Return 5xx so Svix retries. Idempotency (onConflictDoNothing) handles
    // double-deliveries.
    return NextResponse.json({ error: "db_write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
