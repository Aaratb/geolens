/**
 * Lightweight Readability-style main-content extractor. We avoid the full
 * @mozilla/readability dependency in favor of a focused heuristic: pick the
 * subtree with the highest text-density score, biased toward semantic tags.
 *
 * Good enough for v1 metrics. We're measuring text shape, not rendering it.
 */
import type { CheerioAPI } from "cheerio";

const SEMANTIC_BIAS = new Set(["main", "article", "section"]);
const PENALTY = new Set(["nav", "footer", "header", "aside"]);

export interface ExtractedContent {
  /** The plain text of the main content block. */
  text: string;
  /** Selector path of the chosen root, for debugging. */
  rootSelector: string;
}

export function extractMainContent($: CheerioAPI): ExtractedContent {
  // Strip non-content tags from the working document.
  const work = $.load($.html());
  work("script, style, noscript, template, iframe, svg").remove();

  let bestNode: { selector: string; score: number; text: string } = {
    selector: "body",
    score: 0,
    text: work("body").text().replace(/\s+/g, " ").trim(),
  };

  // Score each candidate container; pick the one with the highest score.
  work("body, main, article, section, div").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "div";
    if (PENALTY.has(tag)) return;

    const $el = work(el);
    // Skip tiny/empty containers
    const text = $el.text().replace(/\s+/g, " ").trim();
    if (text.length < 200) return;

    const pCount = $el.find("p").length;
    const linkChars = $el.find("a").text().length;
    const totalChars = text.length;
    const linkDensity = totalChars === 0 ? 1 : linkChars / totalChars;

    let score = pCount * 10 + Math.sqrt(totalChars);
    if (SEMANTIC_BIAS.has(tag)) score *= 1.5;
    score *= 1 - Math.min(linkDensity, 0.9);

    if (score > bestNode.score) {
      bestNode = { selector: tag, score, text };
    }
  });

  return { text: bestNode.text, rootSelector: bestNode.selector };
}
