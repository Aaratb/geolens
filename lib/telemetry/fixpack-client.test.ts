import { describe, expect, it } from "vitest";
import { buildFixPackClientTelemetryProps, FixPackClientTelemetryBody } from "./fixpack-client";

describe("Fix Pack client telemetry contract", () => {
  it("accepts only client-side Fix Pack interaction events", () => {
    expect(
      FixPackClientTelemetryBody.parse({
        event: "fixpack.cta.clicked",
        scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        source: "scan_report",
        action: "sign_in",
      }),
    ).toEqual({
      event: "fixpack.cta.clicked",
      scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      source: "scan_report",
      action: "sign_in",
    });

    expect(() =>
      FixPackClientTelemetryBody.parse({
        event: "fixpack.generation.completed",
        scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toThrow();
  });

  it("rejects prompt and Markdown bodies at the telemetry boundary", () => {
    expect(() =>
      FixPackClientTelemetryBody.parse({
        event: "fixpack.prompt.copied",
        scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        prompt: "secret prompt body",
      }),
    ).toThrow();
  });

  it("builds sanitized props from allowed fields only", () => {
    const props = buildFixPackClientTelemetryProps({
      event: "fixpack.prompt.copied",
      scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fixPackId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "completed",
      source: "fix_pack_page",
    });

    expect(props).toEqual({
      scanId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fixPackId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "completed",
      source: "fix_pack_page",
    });
  });
});
