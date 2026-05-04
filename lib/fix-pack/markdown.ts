import type { FixPackPayload } from "./schema";

export const FIX_PACK_AGENT_FILENAME = "geolens-fix-pack-agent.md";

export function renderFixPackAgentMarkdown(payload: FixPackPayload): string {
  const cards = payload.cards
    .map((card, index) => {
      const assetText = escapeMarkdownFence(card.assetText);
      const checklist = card.checklist.map((item) => `- [ ] ${item}`).join("\n");
      const validation = card.validationSteps.map((step) => `- ${step}`).join("\n");
      return [
        `## ${index + 1}. ${card.title}`,
        "",
        `- Finding: ${card.displayId}`,
        `- Severity: ${card.severity}`,
        `- Confidence: ${card.confidence}`,
        `- Asset kind: ${card.assetKind}`,
        "",
        "### Observed Evidence",
        card.observedEvidence,
        "",
        "### Recommended Change",
        card.recommendedChange,
        "",
        "### Asset",
        "```",
        assetText,
        "```",
        "",
        "### Checklist",
        checklist,
        "",
        "### Validation",
        validation,
        ...(card.caveat ? ["", "### Caveat", card.caveat] : []),
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# GEOlens Fix Pack Agent",
    "",
    "> AI-generated from your GEOlens scan. Review and test every recommendation before applying changes.",
    "",
    escapeMarkdownFence(payload.agentMarkdown),
    "",
    "## Operating Prompt",
    "",
    "```text",
    escapeMarkdownFence(payload.prompt),
    "```",
    "",
    "## Fix Cards",
    "",
    cards,
    "",
    "## Install",
    "",
    "### Claude Code",
    payload.install.claudeCode,
    "",
    "### Cursor",
    payload.install.cursor,
    "",
    "### AGENTS.md",
    payload.install.agentsMd,
    "",
    "## Caveats",
    "",
    payload.caveats.map((caveat) => `- ${caveat}`).join("\n"),
    "",
  ].join("\n");
}

function escapeMarkdownFence(value: string): string {
  return value.replaceAll("```", "` ` `");
}
