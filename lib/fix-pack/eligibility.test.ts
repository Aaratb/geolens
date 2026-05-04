import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFixPackEligibility } from "./eligibility";

const ENV_KEYS = [
  "FIX_PACK_ENABLED",
  "FIX_PACK_BETA_USER_IDS",
  "FIX_PACK_BETA_EMAILS",
] as const;

describe("getFixPackEligibility", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("is disabled by default", () => {
    expect(getFixPackEligibility({ id: "user_1", email: "a@example.com" })).toEqual({
      eligible: false,
      reason: "feature_disabled",
    });
  });

  it("allows a user id in the beta allowlist", () => {
    process.env.FIX_PACK_ENABLED = "true";
    process.env.FIX_PACK_BETA_USER_IDS = "user_1, user_2";

    expect(getFixPackEligibility({ id: "user_2", email: "b@example.com" })).toEqual({
      eligible: true,
    });
  });

  it("allows an email in the beta allowlist case-insensitively", () => {
    process.env.FIX_PACK_ENABLED = "true";
    process.env.FIX_PACK_BETA_EMAILS = "Alpha@Example.com";

    expect(getFixPackEligibility({ id: "user_3", email: "alpha@example.com" })).toEqual({
      eligible: true,
    });
  });

  it("rejects enabled users who are not allowlisted", () => {
    process.env.FIX_PACK_ENABLED = "true";
    process.env.FIX_PACK_BETA_USER_IDS = "user_1";
    process.env.FIX_PACK_BETA_EMAILS = "alpha@example.com";

    expect(getFixPackEligibility({ id: "user_4", email: "beta@example.com" })).toEqual({
      eligible: false,
      reason: "not_allowlisted",
    });
  });

  it("rejects anonymous users when the feature is enabled", () => {
    process.env.FIX_PACK_ENABLED = "true";

    expect(getFixPackEligibility(null)).toEqual({
      eligible: false,
      reason: "not_allowlisted",
    });
  });
});
