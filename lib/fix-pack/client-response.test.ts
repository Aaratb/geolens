import { describe, expect, it } from "vitest";
import {
  parseFixPackGenerateResponse,
  parseFixPackStatusResponse,
} from "./client-response";

const payload = {
  cards: [
    {
      displayId: "GL-01",
      title: "Add llms.txt",
      severity: "high",
      confidence: "high",
      observedEvidence: "No llms.txt file was found.",
      recommendedChange: "Publish an llms.txt file.",
      assetKind: "llms_txt",
      assetText: "# Example llms.txt",
      checklist: ["Create llms.txt", "Deploy it"],
      validationSteps: ["Open /llms.txt"],
    },
    {
      displayId: "GL-02",
      title: "Rewrite metadata",
      severity: "medium",
      confidence: "medium",
      observedEvidence: "Metadata is unclear.",
      recommendedChange: "Rewrite title and description.",
      assetKind: "metadata",
      assetText: "Title: Example",
      checklist: ["Update title", "Update description"],
      validationSteps: ["Inspect metadata"],
    },
    {
      displayId: "GL-03",
      title: "Add pricing FAQ",
      severity: "medium",
      confidence: "low",
      observedEvidence: "Pricing answers are thin.",
      recommendedChange: "Add a factual pricing FAQ.",
      assetKind: "content_brief",
      assetText: "FAQ draft",
      checklist: ["Draft FAQ", "Review claims"],
      validationSteps: ["Compare with pricing page"],
    },
  ],
  prompt: "Fix the top three GEOlens findings.",
  agentMarkdown: "Use these instructions in your coding agent.",
  install: {
    claudeCode: "Add a CLAUDE.md reference.",
    cursor: "Add a Cursor rule reference.",
    agentsMd: "Add an AGENTS.md reference.",
  },
  caveats: ["AI answers and citations are controlled by each platform."],
};

describe("Fix Pack client response contracts", () => {
  it("accepts completed status responses with a validated payload", () => {
    const parsed = parseFixPackStatusResponse({
      eligible: true,
      status: "completed",
      fixPack: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version: "v1",
        ...payload,
      },
    });

    expect(parsed.eligible).toBe(true);
  });

  it("rejects malformed status responses before UI state updates", () => {
    expect(() =>
      parseFixPackStatusResponse({
        eligible: true,
        status: "completed",
        fixPack: { id: "not-a-pack" },
      }),
    ).toThrow();
  });

  it("accepts successful generation responses", () => {
    expect(
      parseFixPackGenerateResponse({
        ok: true,
        status: "generating",
        fixPackId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toEqual({
      ok: true,
      status: "generating",
      fixPackId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  it("rejects unexpected generation response shapes", () => {
    expect(() => parseFixPackGenerateResponse({ ok: true, status: "queued" })).toThrow();
  });
});
