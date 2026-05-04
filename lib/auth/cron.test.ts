import { describe, expect, it, beforeEach } from "vitest";
import { isAuthorizedCron } from "./cron";

const REAL_SECRET = "super-secret-token-for-tests-1234567890";

describe("isAuthorizedCron", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = REAL_SECRET;
  });

  it("rejects when no auth header is sent", () => {
    const req = new Request("http://x/", { headers: {} });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects when CRON_SECRET env is unset", () => {
    delete process.env.CRON_SECRET;
    const req = new Request("http://x/", {
      headers: { authorization: `Bearer ${REAL_SECRET}` },
    });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("accepts the correct bearer token", () => {
    const req = new Request("http://x/", {
      headers: { authorization: `Bearer ${REAL_SECRET}` },
    });
    expect(isAuthorizedCron(req)).toBe(true);
  });

  it("rejects a wrong-token of identical length (timing-safe compare path)", () => {
    const wrongSameLength = "x".repeat(REAL_SECRET.length);
    const req = new Request("http://x/", {
      headers: { authorization: `Bearer ${wrongSameLength}` },
    });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects a wrong-token of different length without throwing", () => {
    const req = new Request("http://x/", {
      headers: { authorization: "Bearer short" },
    });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects a missing 'Bearer ' prefix", () => {
    const req = new Request("http://x/", {
      headers: { authorization: REAL_SECRET },
    });
    expect(isAuthorizedCron(req)).toBe(false);
  });
});
