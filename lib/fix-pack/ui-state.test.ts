import { describe, expect, it } from "vitest";
import { getFixPackActionState, getFixPackDownloadHref } from "./ui-state";

describe("Fix Pack UI state", () => {
  it("asks eligible users to generate a missing Fix Pack", () => {
    expect(getFixPackActionState({ status: "not_generated" })).toEqual({
      label: "Generate Fix Pack",
      disabled: false,
      tone: "accent",
    });
  });

  it("disables actions while generation is already in progress", () => {
    expect(getFixPackActionState({ status: "generating" })).toEqual({
      label: "Generating...",
      disabled: true,
      tone: "muted",
    });
  });

  it("switches to download once a completed pack exists", () => {
    expect(getFixPackActionState({ status: "completed" })).toEqual({
      label: "Download agent.md",
      disabled: false,
      tone: "accent",
    });
  });

  it("allows eligible users to retry a failed Fix Pack", () => {
    expect(getFixPackActionState({ status: "failed" })).toEqual({
      label: "Generate Fix Pack",
      disabled: false,
      tone: "accent",
    });
  });

  it("builds the stable Markdown download path", () => {
    expect(getFixPackDownloadHref("scan_123")).toBe("/api/v1/scans/scan_123/fix-pack/agent.md");
  });
});
