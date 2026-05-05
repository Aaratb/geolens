import { describe, expect, it } from "vitest";
import { getFixPackEligibility } from "./eligibility";

describe("getFixPackEligibility", () => {
  it("requires authentication without falling back to a waitlist gate", () => {
    expect(getFixPackEligibility(null)).toEqual({
      eligible: false,
      reason: "unauthenticated",
    });
  });

  it("allows signed-in users without a feature flag or allowlist", () => {
    expect(getFixPackEligibility({ id: "user_4", email: "beta@example.com" })).toEqual({
      eligible: true,
    });
  });
});
