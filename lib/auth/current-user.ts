/**
 * Thin abstraction over Clerk per ADR-001 — keeps Clerk-specific imports
 * isolated so a future provider swap touches only this file.
 */
import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session.userId) return null;
  const u = await clerkCurrentUser();
  if (!u) return null;
  const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
  return { id: u.id, email };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

/**
 * Make sure the Clerk user exists in our local users table before we insert
 * any FK-bearing row (e.g. scans.user_id). The Clerk webhook should keep this
 * in sync, but a missed/late webhook must never break a signed-in user's scan.
 * Idempotent — safe to call on every request.
 */
export async function ensureUserSynced(u: CurrentUser): Promise<void> {
  await db
    .insert(users)
    .values({ id: u.id, email: u.email ?? "" })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: sql`COALESCE(EXCLUDED.email, ${users.email})` },
    });
}
