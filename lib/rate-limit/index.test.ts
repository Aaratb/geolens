import { describe, expect, it } from "vitest";
import { extractIp, __testing } from "./index";

const { getFixPackGenerationLimitKey, hashIp } = __testing;

describe("hashIp", () => {
  it("produces a stable 32-char hex hash", () => {
    const a = hashIp("203.0.113.5");
    const b = hashIp("203.0.113.5");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("differs for different IPs", () => {
    expect(hashIp("203.0.113.5")).not.toBe(hashIp("203.0.113.6"));
  });
});

describe("extractIp", () => {
  // Order locked by Phase 7 review S-HIGH-3: trust most authoritative first.
  // cf-connecting-ip > x-real-ip > x-vercel-forwarded-for > x-forwarded-for (rightmost).

  it("prefers cf-connecting-ip", () => {
    const h = new Headers({
      "cf-connecting-ip": "192.0.2.4",
      "x-forwarded-for": "spoof.spoof, 10.0.0.1",
    });
    expect(extractIp(h)).toBe("192.0.2.4");
  });

  it("falls back to x-real-ip when cf is absent", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.7" });
    expect(extractIp(h)).toBe("198.51.100.7");
  });

  it("uses x-forwarded-for rightmost (last entry, set by trusted proxy)", () => {
    const h = new Headers({ "x-forwarded-for": "spoof.spoof, 203.0.113.5, 10.0.0.1" });
    expect(extractIp(h)).toBe("10.0.0.1");
  });

  it("returns 0.0.0.0 with no headers", () => {
    expect(extractIp(new Headers())).toBe("0.0.0.0");
  });
});

describe("getFixPackGenerationLimitKey", () => {
  it("rate limits authenticated Fix Pack generation by user first", () => {
    expect(getFixPackGenerationLimitKey({ userId: "user_123", ipHash: "ip_hash" })).toBe(
      "user:user_123",
    );
  });

  it("falls back to IP hash only when there is no user id", () => {
    expect(getFixPackGenerationLimitKey({ userId: null, ipHash: "ip_hash" })).toBe("ip:ip_hash");
  });
});
