import { describe, expect, it } from "vitest";
import { __testing } from "@/lib/hooks/use-scan-stream";

describe("useScanStream reducer", () => {
  it("tracks transport state transitions while streaming", () => {
    const { reducer, initial } = __testing;
    const started = reducer(initial, {
      type: "scan.started",
      url: "https://example.com",
    });
    expect(started.status).toBe("streaming");
    expect(started.transportStatus).toBe("live");

    const reconnecting = reducer(started, { type: "stream.reconnecting" });
    expect(reconnecting.transportStatus).toBe("reconnecting");

    const stalled = reducer(reconnecting, { type: "stream.stalled" });
    expect(stalled.transportStatus).toBe("stalled");

    const liveAgain = reducer(stalled, { type: "stream.live" });
    expect(liveAgain.transportStatus).toBe("live");
  });

  it("forces resolved transport on terminal states", () => {
    const { reducer, initial } = __testing;
    const completed = reducer(initial, {
      type: "scan.completed",
      durationMs: 1500,
      costCents: 12,
      pagesScanned: 1,
      enginesProbed: 4,
      enginesSkipped: 0,
    });
    expect(completed.status).toBe("complete");
    expect(completed.transportStatus).toBe("resolved");

    const failed = reducer(initial, {
      type: "scan.failed",
      stage: "crawl/network",
      reason: "network error",
    });
    expect(failed.status).toBe("failed");
    expect(failed.transportStatus).toBe("resolved");
  });

  it("resets state and maps timeout failure correctly", () => {
    const { reducer, initial } = __testing;
    const started = reducer(initial, {
      type: "scan.started",
      url: "https://example.com",
    });
    const timedOut = reducer(started, {
      type: "scan.timeout",
      reason: "stream stalled",
    });
    expect(timedOut.status).toBe("failed");
    expect(timedOut.failure?.stage).toBe("stream");
    expect(timedOut.transportStatus).toBe("resolved");

    const reset = reducer(timedOut, { type: "stream.reset" });
    expect(reset.status).toBe("connecting");
    expect(reset.pages).toHaveLength(0);
    expect(reset.topThree).toHaveLength(0);
  });
});
