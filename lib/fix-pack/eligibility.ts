import type { CurrentUser } from "@/lib/auth/current-user";

export type FixPackEligibility =
  | { eligible: true }
  | { eligible: false; reason: "unauthenticated" };

export function getFixPackEligibility(user: CurrentUser | null): FixPackEligibility {
  if (!user) {
    return { eligible: false, reason: "unauthenticated" };
  }

  return { eligible: true };
}
