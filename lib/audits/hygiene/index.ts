/**
 * Aggregates all hygiene check modules into a single entry point. Each
 * module is independent so a failure in one doesn't hide signals from another.
 */
import type { CheerioAPI } from "cheerio";
import type { HygieneCheck } from "../types";
import { checkLlmsTxt } from "./llms-txt";
import { checkRobotsAiCrawlers } from "./robots-ai";
import { checkJsonLd } from "./jsonld";
import { checkMeta } from "./meta";
import { checkHeadings } from "./headings";
import { checkSemantic } from "./semantic";

interface RunOptions {
  homepage: string;
  $: CheerioAPI;
  robotsTxt: string | null;
  fetcher?: typeof fetch;
  userAgent?: string;
}

export async function runHygieneChecks(opts: RunOptions): Promise<HygieneCheck[]> {
  const [llms, robotsAi] = await Promise.all([
    checkLlmsTxt({ homepage: opts.homepage, fetcher: opts.fetcher, userAgent: opts.userAgent }),
    Promise.resolve(checkRobotsAiCrawlers(opts.robotsTxt)),
  ]);

  const sync = [
    ...checkJsonLd(opts.$),
    ...checkMeta(opts.$),
    ...checkHeadings(opts.$),
    ...checkSemantic(opts.$),
  ];

  return [...llms, ...robotsAi, ...sync];
}

/**
 * Compute a 0-100 hygiene score from a HygieneCheck list per spec §6.2.
 * Failures cost full impact, warnings half, passes count toward the cap.
 */
export function aggregateHygieneScore(checks: HygieneCheck[]): number {
  if (checks.length === 0) return 0;
  let earned = 0;
  let total = 0;
  for (const c of checks) {
    total += c.scoreImpact;
    if (c.status === "pass") earned += c.scoreImpact;
    else if (c.status === "warn") earned += c.scoreImpact * 0.5;
  }
  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

export type { HygieneCheck };
