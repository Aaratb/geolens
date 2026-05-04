import { describe, expect, it } from "vitest";
import { __testing } from "./budget";

const { formatDay, DAILY_KEY } = __testing;

describe("budget — formatDay", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    expect(formatDay(new Date("2026-05-04T18:30:00Z"))).toBe("2026-05-04");
    expect(formatDay(new Date("2026-01-09T05:00:00Z"))).toBe("2026-01-09");
  });

  it("uses UTC, not local timezone", () => {
    // 2026-05-04T23:30:00Z is still 2026-05-04 in UTC even if local is 2026-05-05
    expect(formatDay(new Date("2026-05-04T23:30:00Z"))).toBe("2026-05-04");
  });
});

describe("budget — DAILY_KEY", () => {
  it("namespaces under geolens:spend", () => {
    expect(DAILY_KEY("2026-05-04")).toBe("geolens:spend:2026-05-04");
  });
});
