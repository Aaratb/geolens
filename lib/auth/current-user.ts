/**
 * Thin abstraction over Clerk per ADR-001 — keeps Clerk-specific imports
 * isolated so a future provider swap touches only this file.
 */
import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";

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
