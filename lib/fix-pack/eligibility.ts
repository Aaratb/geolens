import type { CurrentUser } from "@/lib/auth/current-user";

export type FixPackIneligibleReason = "feature_disabled" | "not_allowlisted";

export type FixPackEligibility =
  | { eligible: true }
  | { eligible: false; reason: FixPackIneligibleReason };

function parseAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getFixPackEligibility(user: CurrentUser | null): FixPackEligibility {
  if (process.env.FIX_PACK_ENABLED !== "true") {
    return { eligible: false, reason: "feature_disabled" };
  }

  const userIds = parseAllowlist(process.env.FIX_PACK_BETA_USER_IDS);
  const emails = parseAllowlist(process.env.FIX_PACK_BETA_EMAILS);
  const email = user?.email?.toLowerCase() ?? null;

  if (user && (userIds.has(user.id.toLowerCase()) || (email !== null && emails.has(email)))) {
    return { eligible: true };
  }

  return { eligible: false, reason: "not_allowlisted" };
}
