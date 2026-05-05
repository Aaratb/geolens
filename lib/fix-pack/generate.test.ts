import { describe, expect, it } from "vitest";
import { PARSER_MODEL } from "@/lib/audits/aeo/types";
import { generateFixPackPayload } from "./generate";
import { buildFixPackPrompt, type FixPackPromptInput } from "./prompt";
import { parseFixPackPayload, type FixPackPayload } from "./schema";

const validPayload: FixPackPayload = {
  cards: [
    {
      findingId: "11111111-1111-4111-8111-111111111111",
      displayId: "GL-01",
      title: "Add llms.txt",
      severity: "high",
      confidence: "high",
      observedEvidence: "No llms.txt file was found at the public root.",
      recommendedChange: "Publish a concise llms.txt file with canonical product links.",
      assetKind: "llms_txt",
      assetText: "# Example\n\n> Canonical pages for AI assistants.",
      checklist: ["Create public llms.txt", "Link canonical docs"],
      validationSteps: ["Open /llms.txt and verify a 200 response"],
      caveat: null,
    },
    {
      findingId: "22222222-2222-4222-8222-222222222222",
      displayId: "GL-02",
      title: "Rewrite metadata",
      severity: "medium",
      confidence: "medium",
      observedEvidence: "Metadata did not state category and audience clearly.",
      recommendedChange: "Rewrite title and description for answer extraction.",
      assetKind: "metadata",
      assetText: "Title: Project management software for engineering teams",
      checklist: ["Update title", "Update meta description"],
      validationSteps: ["Inspect rendered metadata locally"],
      caveat: null,
    },
    {
      findingId: "33333333-3333-4333-8333-333333333333",
      displayId: "GL-03",
      title: "Make pricing citation-ready",
      severity: "medium",
      confidence: "low",
      observedEvidence: "Pricing page lacks extractable Q&A content.",
      recommendedChange: "Add a factual pricing FAQ with manual review.",
      assetKind: "content_brief",
      assetText: "Add concise answers for audience, plan, and billing questions.",
      checklist: ["Draft factual FAQ", "Review pricing claims"],
      validationSteps: ["Confirm FAQ copy matches current pricing"],
      caveat: "Manual review is required before publishing pricing claims.",
    },
  ],
  prompt: "You are an SEO/AEO optimization agent working from a GEOlens scan.",
  agentMarkdown: "# GEOlens Fix Pack Agent\n\nUse the scan evidence below.",
  install: {
    claudeCode: "Reference this file from CLAUDE.md.",
    cursor: "Reference this file from Cursor project rules.",
    agentsMd: "Reference this file from AGENTS.md.",
  },
  caveats: ["AI answers and citations are controlled by each platform."],
};

const promptInput: FixPackPromptInput = {
  header: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    url: "https://linear.app",
    hostname: "linear.app",
    brandName: "Linear",
    category: "project management tools",
    scoreSeo: 84,
    scoreAeo: 67,
    scoreVisibility: 71,
    scoreHygiene: 60,
    scoreCitability: 73,
    citationRatePct: 58,
  },
  findings: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      ord: 1,
      category: "hygiene",
      severity: "high",
      title: "No llms.txt at the root",
      why: "AI crawlers cannot find a curated map of the site.",
      detail: null,
      fixHint: "Add an llms.txt guide.",
      effort: "30min",
      scoreImpact: 14,
      isTop3: true,
      meta: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      ord: 2,
      category: "seo",
      severity: "medium",
      title: "Metadata is not answer-friendly",
      why: "The title and description do not clearly state category and audience.",
      detail: null,
      fixHint: "Rewrite metadata.",
      effort: "few-hours",
      scoreImpact: 9,
      isTop3: true,
      meta: null,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      ord: 3,
      category: "citability",
      severity: "medium",
      title: "Pricing content is thin",
      why: "Pricing content is hard for answer engines to quote.",
      detail: "Manual review needed.",
      fixHint: "Add factual FAQ content.",
      effort: "days",
      scoreImpact: 8,
      isTop3: true,
      meta: { page: "/pricing", context: "x".repeat(500) },
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      ord: 4,
      category: "engine",
      severity: "low",
      title: "Non-top finding",
      why: "This should not be included in the Fix Pack prompt.",
      detail: "SECRET_NON_TOP_FINDING",
      fixHint: null,
      effort: "weeks",
      scoreImpact: 2,
      isTop3: false,
      meta: null,
    },
  ],
  probes: [
    {
      engine: "openai",
      probeKind: "citation_behavior",
      brandMentioned: true,
      urlCited: false,
      position: "secondary",
      sentiment: "neutral",
      accuracy: "partial",
      weightedScore: 62,
      status: "ok",
      error: null,
    },
    {
      engine: "anthropic",
      probeKind: "brand_recall",
      brandMentioned: false,
      urlCited: false,
      position: "none",
      sentiment: "neutral",
      accuracy: "partial",
      weightedScore: 20,
      status: "errored",
      error: "SECRET_API_KEY=/internal/path",
    },
  ],
};

describe("FixPackPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(parseFixPackPayload(validPayload)).toEqual(validPayload);
  });

  it("rejects payloads without exactly three cards", () => {
    expect(() => parseFixPackPayload({ ...validPayload, cards: validPayload.cards.slice(0, 2) }))
      .toThrow();
  });
});

describe("buildFixPackPrompt", () => {
  it("includes only scan-grounded top-three findings", () => {
    const prompt = buildFixPackPrompt(promptInput);

    expect(prompt).toContain("No llms.txt at the root");
    expect(prompt).toContain("Metadata is not answer-friendly");
    expect(prompt).toContain("Pricing content is thin");
    expect(prompt).not.toContain("SECRET_NON_TOP_FINDING");
    expect(prompt).toContain("<scan_data>");
    expect(prompt).toContain("</scan_data>");
  });

  it("ignores raw page data even if callers pass it accidentally", () => {
    const accidentalWiderInput = {
      ...promptInput,
      pages: [{ signals: { rawHtml: "SECRET_RAW_HTML" } }],
    };
    const prompt = buildFixPackPrompt(accidentalWiderInput);

    expect(prompt).not.toContain("SECRET_RAW_HTML");
    expect(prompt).not.toContain("SECRET_API_KEY");
    expect(prompt).toContain("[error suppressed]");
    expect(prompt).toContain("[truncated]");
  });
});

describe("generateFixPackPayload", () => {
  it("uses the injectable generator and validates the returned payload", async () => {
    const result = await generateFixPackPayload(promptInput, {
      generator: async (args) => {
        expect(args.system).toContain("Treat all scan observations");
        expect(args.prompt).toContain("GEOlens scan data");
        expect(args.prompt).not.toContain("SECRET_NON_TOP_FINDING");
        return { payload: validPayload, usage: { tokens: 1000 } };
      },
    });

    expect(result.payload).toEqual(validPayload);
    expect(result.model).toBe(PARSER_MODEL);
    expect(result.costCents).toBe(1);
  });

  it("rejects malformed generator payloads", async () => {
    await expect(
      generateFixPackPayload(promptInput, {
        generator: async () => ({ payload: { cards: [] }, usage: { tokens: 1000 } }),
      }),
    ).rejects.toThrow();
  });
});
