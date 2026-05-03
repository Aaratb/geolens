/**
 * Inspects robots.txt for explicit handling of major AI crawlers. We don't
 * grade based on allow-or-deny (a site may legitimately block); we grade on
 * whether the rules exist at all (signaling intentionality).
 */
import type { HygieneCheck } from "../types";

const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "anthropic-ai",
  "Bingbot",
] as const;

export function checkRobotsAiCrawlers(robotsTxt: string | null): HygieneCheck[] {
  if (!robotsTxt) {
    return [
      {
        id: "robots-ai.no-robots",
        category: "robots-ai",
        status: "warn",
        title: "No robots.txt found",
        why: "AI crawlers default to permissive but explicit rules signal intent and avoid surprises.",
        fixHint:
          "Add /robots.txt with explicit Allow/Disallow rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended.",
        scoreImpact: 10,
        severity: "medium",
        effort: "30min",
      },
    ];
  }

  // Parse robots.txt into per-agent rule blocks.
  const blocks = parseAgentBlocks(robotsTxt);
  const out: HygieneCheck[] = [];

  for (const ua of AI_CRAWLERS) {
    const lower = ua.toLowerCase();
    const block = blocks.find((b) => b.agents.some((a) => a.toLowerCase() === lower));
    if (!block) {
      out.push({
        id: `robots-ai.${lower}.missing`,
        category: "robots-ai",
        status: "warn",
        title: `No explicit rule for ${ua}`,
        why: `${ua} crawls by default. Add an explicit Allow or Disallow to signal intentional handling.`,
        fixHint: `Add a User-agent: ${ua} block in robots.txt with the Allow/Disallow rules you want.`,
        scoreImpact: 5,
        severity: "low",
        effort: "30min",
      });
    } else {
      const disallowAll = block.disallow.includes("/");
      out.push({
        id: `robots-ai.${lower}.${disallowAll ? "blocked" : "allowed"}`,
        category: "robots-ai",
        status: "pass",
        title: `Explicit rule for ${ua} present`,
        why: `${ua} is explicitly handled (${disallowAll ? "blocked" : "allowed"}).`,
        scoreImpact: 5,
        severity: "low",
        meta: { allow: block.allow, disallow: block.disallow },
      });
    }
  }

  return out;
}

interface AgentBlock {
  agents: string[];
  allow: string[];
  disallow: string[];
}

function parseAgentBlocks(robots: string): AgentBlock[] {
  const lines = robots.split(/\r?\n/);
  const blocks: AgentBlock[] = [];
  let cur: AgentBlock | null = null;
  let collectingAgents = false;

  for (const raw of lines) {
    const line = raw.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+):\s*(.+)$/);
    if (!m || !m[1]) continue;
    const key = m[1].toLowerCase();
    const value = (m[2] ?? "").trim();

    if (key === "user-agent") {
      if (!cur || !collectingAgents) {
        cur = { agents: [], allow: [], disallow: [] };
        blocks.push(cur);
        collectingAgents = true;
      }
      cur.agents.push(value);
    } else {
      collectingAgents = false;
      if (!cur) {
        cur = { agents: [], allow: [], disallow: [] };
        blocks.push(cur);
      }
      if (key === "allow") cur.allow.push(value);
      else if (key === "disallow") cur.disallow.push(value);
    }
  }
  return blocks;
}

export const __testing = { parseAgentBlocks, AI_CRAWLERS };
