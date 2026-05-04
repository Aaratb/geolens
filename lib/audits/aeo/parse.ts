/**
 * Parse a probe's prose response into structured fields (brand_mentioned,
 * url_cited, position, sentiment, accuracy).
 *
 * Uses generateObject with a Zod schema so the parser can't go off-spec.
 * Falls back to a deterministic regex parser if the LLM call fails — this
 * keeps the scan moving even if the parser model is rate-limited.
 */
import { generateObject } from "ai";
import { z } from "zod";
import { ACCURACIES, POSITIONS, SENTIMENTS } from "@/lib/db/schema";
import { PARSER_SYSTEM } from "./prompts";
import { PARSER_MODEL } from "./types";
import { modelFor } from "@/lib/ai/gateway";
import type { BrandContext, ParsedProbeFields } from "./types";

const schema = z.object({
  brandMentioned: z.boolean(),
  urlCited: z.boolean(),
  position: z.enum(POSITIONS),
  sentiment: z.enum(SENTIMENTS),
  accuracy: z.enum(ACCURACIES),
});

interface ParseInput {
  ctx: BrandContext;
  responseText: string;
  /** Optional override for tests. */
  parser?: (args: ParseArgs) => Promise<ParsedProbeFields>;
}

interface ParseArgs {
  ctx: BrandContext;
  responseText: string;
}

export async function parseProbeResponse(input: ParseInput): Promise<ParsedProbeFields> {
  const parser = input.parser ?? llmParser;
  try {
    return await parser({ ctx: input.ctx, responseText: input.responseText });
  } catch {
    return heuristicParser(input.ctx, input.responseText);
  }
}

async function llmParser({ ctx, responseText }: ParseArgs): Promise<ParsedProbeFields> {
  const { object } = await generateObject({
    model: modelFor(PARSER_MODEL),
    schema,
    system: PARSER_SYSTEM,
    prompt:
      `Brand: ${ctx.brandName}\n` +
      `Hostname: ${ctx.hostname}\n` +
      `Category: ${ctx.category}\n\n` +
      `--- BEGIN AI RESPONSE ---\n${responseText}\n--- END AI RESPONSE ---`,
  });
  return object;
}

/**
 * Deterministic fallback. Looks for verbatim brand and hostname mentions and
 * estimates position by where the brand appears in the response. Sentiment
 * defaults to neutral; accuracy defaults to accurate. Less precise than the
 * LLM parser but always available.
 */
export function heuristicParser(ctx: BrandContext, response: string): ParsedProbeFields {
  const text = response.toLowerCase();
  const brand = ctx.brandName.toLowerCase();
  const host = ctx.hostname.toLowerCase();

  const brandMentioned = brand.length > 0 && text.includes(brand);
  const urlCited =
    host.length > 0 &&
    (text.includes(host) || text.includes(host.replace(/^www\./, "")));

  let position: ParsedProbeFields["position"] = "none";
  if (brandMentioned) {
    const idx = text.indexOf(brand);
    const ratio = idx / Math.max(text.length, 1);
    if (ratio < 0.25) position = "primary";
    else if (ratio < 0.6) position = "secondary";
    else position = "tertiary";
  }

  return {
    brandMentioned,
    urlCited,
    position,
    sentiment: "neutral",
    accuracy: "accurate",
  };
}
