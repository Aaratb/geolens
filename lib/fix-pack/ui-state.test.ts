import { describe, expect, it } from "vitest";
import { getFixPackActionState, getFixPackDownloadHref } from "./ui-state";

describe("Fix Pack UI state", () => {
  it("asks eligible users to generate a missing Fix Pack", () => {
    expect(getFixPackActionState({ eligible: true, status: "not_generated" })).toEqual({
      label: "Generate Fix Pack",
      disabled: false,
      tone: "accent",
    });
  });

  it("disables actions while generation is already in progress", () => {
    expect(getFixPackActionState({ eligible: true, status: "generating" })).toEqual({
      label: "Generating...",
      disabled: true,
      tone: "muted",
    });
  });

  it("switches to download once a completed pack exists", () => {
    expect(getFixPackActionState({ eligible: true, status: "completed" })).toEqual({
      label: "Download agent.md",
      disabled: false,
      tone: "accent",
    });
  });

  it("allows eligible users to retry a failed Fix Pack", () => {
    expect(getFixPackActionState({ eligible: true, status: "failed" })).toEqual({
      label: "Generate Fix Pack",
      disabled: false,
      tone: "accent",
    });
  });

  it("routes ineligible users to the waitlist", () => {
    expect(getFixPackActionState({ eligible: false, status: "not_generated" })).toEqual({
      label: "Join the waitlist",
      disabled: false,
      tone: "outline",
    });
  });

  it("builds the stable Markdown download path", () => {
    expect(getFixPackDownloadHref("scan_123")).toBe("/api/v1/scans/scan_123/fix-pack/agent.md");
  });
});
