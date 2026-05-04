/**
 * Probe prompt templates. Three probes per engine:
 *  - brand_recall:        does the engine know the brand?
 *  - category_placement:  does the engine list the brand in its category?
 *  - citation_behavior:   does the engine cite the URL when asked about it?
 *
 * Prompts are deliberately neutral — we want to measure unprompted ranking,
 * not steer the model toward a specific answer.
 */
import type { ProbeKind } from "@/lib/db/schema";
import type { BrandContext } from "./types";

export function buildPrompt(kind: ProbeKind, ctx: BrandContext): string {
  switch (kind) {
    case "brand_recall":
      return `What is ${ctx.brandName}? Briefly describe what they do, who their typical customers are, and what they're known for. If you don't know, say so directly.`;
    case "category_placement":
      return `List the leading ${ctx.category} options today, in order of how often they're recommended. For each, note one sentence of context. Be concrete.`;
    case "citation_behavior":
      return `Tell me about the website ${ctx.hostname}. What do they offer, who runs it, and what topics do they cover? If you can cite specific pages or sources, do so.`;
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      throw new Error(`Unknown probe kind: ${String(kind)}`);
    }
  }
}

/**
 * Parser system prompt. Used by the cheap parser model to convert prose to
 * structured fields. Lives here so the parser test can lock the contract.
 */
export const PARSER_SYSTEM = `You are an analyst evaluating how an AI search engine described a brand.
Read the AI response and answer with precise, evidence-based fields.

Rules:
- "brand_mentioned" is true ONLY if the brand name appears (verbatim or a clear paraphrase) in the response.
- "url_cited" is true ONLY if the response cites the specific hostname or links to a page on that domain.
- "position" describes WHERE in the response the brand appears:
    - "primary":   the brand is the explicit subject or first/top item in a ranked list.
    - "secondary": the brand is mentioned but not the top focus (middle of a list, etc.).
    - "tertiary":  the brand is mentioned only in passing, as one of many.
    - "none":      the brand is not mentioned at all.
- "sentiment": "positive" (favorable framing), "neutral" (factual), "negative" (critical/dismissive).
- "accuracy" is your judgment of factual correctness:
    - "accurate":     description is factually correct given what's plausible for the hostname.
    - "partial":      partially correct (some accurate facts, some hallucinated or stale).
    - "misattributed": the response confused this brand with another, or invented attributes.

If "brand_mentioned" is false, set position to "none", sentiment to "neutral", accuracy to "accurate" (the engine wasn't wrong; it just didn't mention).`;
