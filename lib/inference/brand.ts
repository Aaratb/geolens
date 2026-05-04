/**
 * Brand & category inference per spec §6. Cheap heuristics first, LLM only as
 * fallback. Cached per url_hash for 24h by the caller.
 *
 * Heuristic ladder:
 *   1. JSON-LD Organization.name + Organization.@type/category
 *   2. og:site_name and og:title
 *   3. <title> tag (split on " | ", " - ", " · ", " — ")
 *   4. <h1>
 *   5. LLM fallback (one cheap call, structured output)
 */
import type { CheerioAPI } from "cheerio";
import { generateObject } from "ai";
import { z } from "zod";
import { PARSER_MODEL } from "@/lib/audits/aeo/types";
import { modelFor } from "@/lib/ai/gateway";

export interface BrandInferenceResult {
  brandName: string;
  category: string;
  llmFallback: boolean;
}

interface InferOptions {
  $: CheerioAPI;
  hostname: string;
  /** Test override: skip the LLM fallback. */
  llm?: (args: { textSample: string; hostname: string }) => Promise<{
    brandName: string;
    category: string;
  }>;
}

export async function inferBrand(opts: InferOptions): Promise<BrandInferenceResult> {
  const { $, hostname } = opts;

  // 1. JSON-LD
  const ld = extractOrgFromJsonLd($);
  if (ld.brandName && ld.category) {
    return { brandName: ld.brandName, category: ld.category, llmFallback: false };
  }

  // 2. OpenGraph
  const ogSiteName = $("head > meta[property='og:site_name']").attr("content")?.trim();
  const ogTitle = $("head > meta[property='og:title']").attr("content")?.trim();

  // 3. <title>
  const titleTag = $("head > title").first().text().trim();
  const titleParts = titleTag.split(/\s*[|·\-—–]\s*/).filter(Boolean);

  // 4. <h1>
  const h1 = $("h1").first().text().trim();

  const strongCandidates: string[] = [ld.brandName ?? "", ogSiteName ?? "", titleParts[0] ?? "", h1]
    .filter((c) => c.length > 1 && c.length < 60);

  const strongBrand = pickShortest(strongCandidates);
  const brandName = strongBrand ?? fallbackBrandFromHost(hostname);

  if (ld.category) {
    return { brandName, category: ld.category, llmFallback: false };
  }

  // No clear category — try OG description / meta description for a hint.
  const ogDesc = $("head > meta[property='og:description']").attr("content")?.trim() ?? "";
  const metaDesc = $("head > meta[name='description']").attr("content")?.trim() ?? "";
  const candidateCategory = guessCategoryFromDescription(`${ogTitle ?? ""} ${ogDesc} ${metaDesc}`);
  if (candidateCategory) {
    return { brandName, category: candidateCategory, llmFallback: false };
  }

  // 5. LLM fallback. Strong heuristic brands (JSON-LD/OG/title/h1) always win;
  //    weak host-derived brands defer to the LLM, which has more context.
  const llm = opts.llm ?? llmInferDefault;
  const sample = collectTextSample($);
  try {
    const out = await llm({ textSample: sample, hostname });
    return {
      brandName: strongBrand ?? out.brandName ?? brandName,
      category: out.category || "company",
      llmFallback: true,
    };
  } catch {
    return { brandName, category: "company", llmFallback: false };
  }
}

/* ---------------- helpers ---------------- */

function extractOrgFromJsonLd($: CheerioAPI): { brandName?: string; category?: string } {
  let brandName: string | undefined;
  let category: string | undefined;

  $("script[type='application/ld+json']").each((_, el) => {
    const txt = $(el).contents().text().trim();
    if (!txt) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(txt);
    } catch {
      return;
    }
    walk(parsed, (node) => {
      const obj = node as Record<string, unknown>;
      const t = obj["@type"];
      const types = Array.isArray(t) ? t : typeof t === "string" ? [t] : [];

      if (
        !brandName &&
        (types.includes("Organization") ||
          types.includes("LocalBusiness") ||
          types.includes("WebSite"))
      ) {
        const name = obj.name;
        if (typeof name === "string" && name.trim()) brandName = name.trim();
      }

      if (!category) {
        // Some sites embed their category directly
        const desc = obj.description;
        if (typeof desc === "string") {
          const guess = guessCategoryFromDescription(desc);
          if (guess) category = guess;
        }
        const productType = obj["productCategory"];
        if (typeof productType === "string") category = productType;
      }
    });
  });
  return { brandName, category };
}

function walk(node: unknown, visitor: (n: unknown) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, visitor);
    return;
  }
  visitor(node);
  for (const v of Object.values(node as Record<string, unknown>)) {
    if (v && typeof v === "object") walk(v, visitor);
  }
}

function pickShortest(candidates: string[]): string | null {
  const distinct = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];
  if (distinct.length === 0) return null;
  distinct.sort((a, b) => a.length - b.length);
  return distinct[0] ?? null;
}

function fallbackBrandFromHost(hostname: string): string {
  const stripped = hostname.replace(/^www\./, "").split(".")[0] ?? hostname;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

const CATEGORY_KEYWORDS: { keywords: RegExp; category: string }[] = [
  { keywords: /\b(crm|customer relationship)\b/i, category: "CRM software" },
  { keywords: /\bemail (marketing|automation)\b/i, category: "email marketing tools" },
  { keywords: /\bproject management\b/i, category: "project management tools" },
  { keywords: /\bdesign tool|prototyping\b/i, category: "design tools" },
  { keywords: /\b(no[ -]?code|low[ -]?code)\b/i, category: "no-code platforms" },
  { keywords: /\bdeveloper (tool|platform)\b/i, category: "developer tools" },
  { keywords: /\bdatabase\b/i, category: "database services" },
  { keywords: /\b(saas|software as a service)\b/i, category: "SaaS platforms" },
  { keywords: /\bagency\b/i, category: "marketing agencies" },
  { keywords: /\b(ecommerce|e-commerce|online store)\b/i, category: "ecommerce platforms" },
  { keywords: /\b(ai|artificial intelligence)\b.*(tool|platform|assistant)/i, category: "AI tools" },
  { keywords: /\b(seo|search engine optimization)\b/i, category: "SEO tools" },
  { keywords: /\b(analytics|tracking)\b/i, category: "analytics platforms" },
  { keywords: /\b(consult|consultancy)/i, category: "consulting firms" },
];

function guessCategoryFromDescription(text: string): string | undefined {
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.test(text)) return category;
  }
  return undefined;
}

function collectTextSample($: CheerioAPI): string {
  const title = $("head > title").first().text().trim();
  const desc = $("head > meta[name='description']").attr("content")?.trim() ?? "";
  const ogDesc = $("head > meta[property='og:description']").attr("content")?.trim() ?? "";
  const h1 = $("h1").first().text().trim();
  const firstP = $("p").first().text().trim();
  return [title, desc, ogDesc, h1, firstP].filter(Boolean).join("\n").slice(0, 4000);
}

const llmSchema = z.object({
  brandName: z.string().min(1).max(80),
  category: z.string().min(1).max(80),
});

async function llmInferDefault({
  textSample,
  hostname,
}: {
  textSample: string;
  hostname: string;
}): Promise<{ brandName: string; category: string }> {
  const { object } = await generateObject({
    model: modelFor(PARSER_MODEL),
    schema: llmSchema,
    system:
      "Given a homepage excerpt, infer the brand name and the product/service category. " +
      "Use natural phrases for category like 'CRM software' or 'AI writing tools'. Be concise.",
    prompt: `Hostname: ${hostname}\n\n${textSample}`,
  });
  return object;
}

export const __testing = {
  pickShortest,
  fallbackBrandFromHost,
  guessCategoryFromDescription,
  extractOrgFromJsonLd,
};
