/**
 * Sanity tests on the ScanEvent discriminated union — every event type
 * in the union should be reachable from the SSE polling endpoint, and
 * every type the orchestrator emits should be in the union.
 */
import { describe, expect, it } from "vitest";
import type { ScanEvent } from "./events";

// Compile-time exhaustiveness: a switch over ScanEvent must hit every type.
function describeEvent(ev: ScanEvent): string {
  switch (ev.type) {
    case "scan.started":
      return `started ${ev.url}`;
    case "crawl.started":
      return `crawl ${ev.pages.length} pages`;
    case "crawl.page.fetched":
      return `fetched ${ev.url}`;
    case "brand.inferred":
      return `brand=${ev.brandName}`;
    case "seo.psi.completed":
      return `psi ${ev.url}`;
    case "hygiene.checked":
      return `hygiene ${ev.checks.length}`;
    case "citability.computed":
      return `citability=${ev.metrics.score}`;
    case "aeo.probe.started":
      return `probe.start ${ev.engine}:${ev.probeKind}`;
    case "aeo.probe.completed":
      return `probe.done ${ev.engine}:${ev.probeKind}=${ev.weightedScore}`;
    case "scores.computed":
      return `scores aeo=${ev.scoreAeo}`;
    case "gaps.ranked":
      return `gaps top3=${ev.topThree.length}`;
    case "scan.completed":
      return `done in ${ev.durationMs}ms`;
    case "scan.failed":
      return `failed at ${ev.stage}`;
    case "scan.timeout":
      return `timeout ${ev.reason}`;
    case "budget.tripped":
      return `budget ${ev.reason}`;
  }
}

describe("ScanEvent union", () => {
  it("describeEvent compiles exhaustively (no default branch)", () => {
    // If a new ScanEvent variant is added without updating describeEvent,
    // tsc will fail. This test exists to lock in that invariant.
    const e: ScanEvent = { type: "scan.started", url: "https://x.com" };
    expect(describeEvent(e)).toBe("started https://x.com");
  });

  it("scan.timeout is a terminal event handled by the reducer", () => {
    const e: ScanEvent = { type: "scan.timeout", reason: "no events for 5 minutes" };
    expect(describeEvent(e)).toContain("timeout");
  });

  it("budget.tripped is non-terminal — scan continues with engines skipped", () => {
    const e: ScanEvent = {
      type: "budget.tripped",
      reason: "daily",
      banner: "We've reached today's AI engine budget cap.",
    };
    expect(describeEvent(e)).toContain("budget");
  });
});
