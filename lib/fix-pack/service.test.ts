import { describe, expect, it, vi } from "vitest";
import type { ScanFixPack } from "@/lib/db/schema";
import type { ScanWithDetails } from "@/lib/scan/queries";
import { generateOrGetFixPack, type GenerateOrGetFixPackOptions } from "./service";
import { renderFixPackAgentMarkdown } from "./markdown";
import type { FixPackPayload } from "./schema";

const now = new Date("2026-05-04T00:00:00.000Z");

const payload: FixPackPayload = {
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
      caveat: "Manual pricing review required.",
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

function fixPack(overrides: Partial<ScanFixPack> = {}): ScanFixPack {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    scanId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    requestedBy: "user_1",
    status: "completed",
    version: "v1",
    payload,
    error: null,
    model: "openai/gpt-4o-mini",
    costCents: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const scan = {
  header: {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  },
  findings: [],
  probes: [],
  pages: [],
} as unknown as ScanWithDetails;

function store(overrides: Partial<NonNullable<GenerateOrGetFixPackOptions["store"]>> = {}) {
  const generating = fixPack({ status: "generating", payload: null, model: null, costCents: null });
  return {
    getByScanId: vi.fn(async () => null),
    startGenerating: vi.fn(async () => ({ row: generating, started: true })),
    markCompleted: vi.fn(async ({ payload: nextPayload, model, costCents }) =>
      fixPack({ payload: nextPayload, model, costCents, status: "completed" }),
    ),
    markFailed: vi.fn(async ({ error }) => fixPack({ status: "failed", error })),
    ...overrides,
  } satisfies NonNullable<GenerateOrGetFixPackOptions["store"]>;
}

describe("generateOrGetFixPack", () => {
  it("returns an existing completed pack without generating again", async () => {
    const existing = fixPack();
    const testStore = store({ getByScanId: vi.fn(async () => existing) });
    const generator = vi.fn(async () => ({ payload, prompt: "p", model: "m", costCents: 1 }));

    const result = await generateOrGetFixPack(scan, { store: testStore, generator });

    expect(result.generated).toBe(false);
    expect(result.payload).toEqual(payload);
    expect(generator).not.toHaveBeenCalled();
    expect(testStore.startGenerating).not.toHaveBeenCalled();
  });

  it("returns an in-progress pack without generating again", async () => {
    const existing = fixPack({
      status: "generating",
      payload: null,
      model: null,
      costCents: null,
      updatedAt: new Date(),
    });
    const testStore = store({ getByScanId: vi.fn(async () => existing) });
    const generator = vi.fn(async () => ({ payload, prompt: "p", model: "m", costCents: 1 }));

    const result = await generateOrGetFixPack(scan, { store: testStore, generator });

    expect(result.status).toBe("generating");
    expect(result.generated).toBe(false);
    expect(generator).not.toHaveBeenCalled();
    expect(testStore.startGenerating).not.toHaveBeenCalled();
  });

  it("reclaims a stale generating pack and generates again", async () => {
    const stale = fixPack({
      status: "generating",
      payload: null,
      model: null,
      costCents: null,
      updatedAt: new Date("2000-01-01T00:00:00.000Z"),
    });
    const reclaimed = fixPack({
      status: "generating",
      payload: null,
      model: null,
      costCents: null,
    });
    const testStore = store({
      getByScanId: vi.fn(async () => stale),
      startGenerating: vi.fn(async () => ({ row: reclaimed, started: true })),
    });
    const generator = vi.fn(async () => ({
      payload,
      prompt: "p",
      model: "openai/gpt-4o-mini",
      costCents: 1,
    }));

    const result = await generateOrGetFixPack(scan, { store: testStore, generator });

    expect(result.status).toBe("completed");
    expect(result.generated).toBe(true);
    expect(testStore.startGenerating).toHaveBeenCalledWith({
      scanId: scan.header.id,
      requestedBy: null,
    });
    expect(generator).toHaveBeenCalledOnce();
  });

  it("creates, generates, and marks a new pack complete", async () => {
    const testStore = store();
    const onGenerationStarted = vi.fn();

    const result = await generateOrGetFixPack(scan, {
      requestedBy: "user_1",
      store: testStore,
      onGenerationStarted,
      generator: async () => ({ payload, prompt: "p", model: "openai/gpt-4o-mini", costCents: 1 }),
    });

    expect(result.status).toBe("completed");
    expect(result.generated).toBe(true);
    expect(onGenerationStarted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    );
    expect(testStore.startGenerating).toHaveBeenCalledWith({
      scanId: scan.header.id,
      requestedBy: "user_1",
    });
    expect(testStore.markCompleted).toHaveBeenCalledWith({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      payload,
      model: "openai/gpt-4o-mini",
      costCents: 1,
    });
  });

  it("returns in-progress when another request owns generation", async () => {
    const existing = fixPack({ status: "generating", payload: null, model: null, costCents: null });
    const testStore = store({
      startGenerating: vi.fn(async () => ({ row: existing, started: false })),
    });
    const generator = vi.fn(async () => ({ payload, prompt: "p", model: "m", costCents: 1 }));

    const result = await generateOrGetFixPack(scan, { store: testStore, generator });

    expect(result.status).toBe("generating");
    expect(generator).not.toHaveBeenCalled();
  });

  it("marks a generating pack failed when generation throws", async () => {
    const testStore = store();

    await expect(
      generateOrGetFixPack(scan, {
        store: testStore,
        generator: async () => {
          throw new Error("model unavailable");
        },
      }),
    ).rejects.toThrow("model unavailable");

    expect(testStore.markFailed).toHaveBeenCalledWith({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      error: "model unavailable",
    });
  });
});

describe("renderFixPackAgentMarkdown", () => {
  it("renders a downloadable Markdown guide from a validated payload", () => {
    const markdown = renderFixPackAgentMarkdown(payload);

    expect(markdown).toContain("# GEOlens Fix Pack Agent");
    expect(markdown).toContain("## 1. Add llms.txt");
    expect(markdown).toContain("```text");
    expect(markdown).toContain("- AI answers and citations are controlled by each platform.");
  });

  it("escapes AI-authored code fences inside fenced sections", () => {
    const markdown = renderFixPackAgentMarkdown({
      ...payload,
      prompt: "Do this\n```\nThen this",
      agentMarkdown: "Agent setup\n```\nInjected section",
      cards: payload.cards.map((card, index) =>
        index === 0 ? { ...card, assetText: "before\n```\nafter" } : card,
      ),
    });

    expect(markdown).not.toContain("```\nThen this");
    expect(markdown).not.toContain("```\nInjected section");
    expect(markdown).not.toContain("```\nafter");
  });
});
