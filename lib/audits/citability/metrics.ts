/**
 * Compute citability metrics from an extracted main content block + the
 * surrounding cheerio document. Score follows spec §6 — Citability is the
 * 15% sub-score of the AEO score.
 */
import type { CheerioAPI } from "cheerio";
import type { CitabilityMetrics } from "../types";
import { extractMainContent } from "./extract";

export function computeCitability($: CheerioAPI): CitabilityMetrics {
  const main = extractMainContent($);
  const totalText = $("body").text().replace(/\s+/g, " ").trim();

  const mainContentChars = main.text.length;
  const totalTextChars = totalText.length;
  const cleanTextRatio =
    totalTextChars === 0 ? 0 : Math.min(1, mainContentChars / Math.max(totalTextChars, 1));

  // Paragraph + sentence shape inside the main block
  const paragraphs = main.text
    .split(/\n+|(?<=\.)\s{2,}/g)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length >= 5); // ignore stubs
  const paragraphLengths = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
  const paragraphMedianWords = median(paragraphLengths);
  const inIdealRange = paragraphLengths.filter((l) => l >= 40 && l <= 80).length;
  const idealParagraphPct =
    paragraphLengths.length === 0 ? 0 : (inIdealRange / paragraphLengths.length) * 100;

  const sentences = main.text.split(/(?<=[.!?])\s+/g).filter((s) => s.trim().length > 0);
  const sentenceLengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const sentenceMedianWords = median(sentenceLengths);

  const structuredElements = $("ul").length + $("ol").length + $("table").length;
  const hasFaqPattern = detectFaqPattern($, main.text);

  // Numbers per 1000 words
  const wordCount = main.text.split(/\s+/).filter(Boolean).length;
  const numberMatches = main.text.match(/\b\d[\d,.]*\b/g)?.length ?? 0;
  const statisticalDensity = wordCount === 0 ? 0 : (numberMatches / wordCount) * 1000;

  // Score 0-100. The clean-text reward is gated by absolute size — a 5-word
  // page can't earn the "low boilerplate" reward just because 5/5 = 100%.
  const sizeMultiplier = Math.min(1, mainContentChars / 500);
  const score = scoreCitability({
    cleanTextRatio: cleanTextRatio * sizeMultiplier,
    idealParagraphPct,
    sentenceMedianWords,
    structuredElements,
    hasFaqPattern,
    statisticalDensity,
  });

  return {
    mainContentChars,
    totalTextChars,
    cleanTextRatio: Number(cleanTextRatio.toFixed(3)),
    paragraphMedianWords,
    idealParagraphPct: Math.round(idealParagraphPct),
    sentenceMedianWords,
    structuredElements,
    hasFaqPattern,
    statisticalDensity: Number(statisticalDensity.toFixed(2)),
    score,
  };
}

function detectFaqPattern($: CheerioAPI, mainText: string): boolean {
  // Signal 1: JSON-LD FAQPage
  const ld = $("script[type='application/ld+json']").text();
  if (/"@type"\s*:\s*"FAQPage"/i.test(ld)) return true;

  // Signal 2: Multiple "Q: ... A: ..." blocks
  if ((mainText.match(/\bQ\s*:\s*/gi)?.length ?? 0) >= 2) return true;

  // Signal 3: Multiple <details>/<summary> question-like patterns
  const summaries = $("details summary")
    .toArray()
    .map((s) => $(s).text().trim());
  const questionish = summaries.filter((s) => /\?\s*$/.test(s)).length;
  return questionish >= 2;
}

interface ScoreInputs {
  cleanTextRatio: number;
  idealParagraphPct: number;
  sentenceMedianWords: number;
  structuredElements: number;
  hasFaqPattern: boolean;
  statisticalDensity: number;
}

function scoreCitability(i: ScoreInputs): number {
  // Each component is 0..1, then weighted. Total weights = 1.0.
  const cleanTextScore = clamp(i.cleanTextRatio / 0.7, 0, 1); // 0.7 ratio = full credit
  const paragraphScore = clamp(i.idealParagraphPct / 60, 0, 1); // 60% in ideal range = full
  const sentenceScore =
    i.sentenceMedianWords >= 12 && i.sentenceMedianWords <= 25
      ? 1
      : Math.max(0, 1 - Math.abs(18.5 - i.sentenceMedianWords) / 18.5);
  const structureScore = clamp(i.structuredElements / 5, 0, 1); // 5 lists/tables = full
  const faqScore = i.hasFaqPattern ? 1 : 0;
  const statsScore = clamp(i.statisticalDensity / 30, 0, 1); // 30 numbers/1000 words = full

  const weighted =
    cleanTextScore * 0.3 +
    paragraphScore * 0.2 +
    sentenceScore * 0.15 +
    structureScore * 0.15 +
    faqScore * 0.1 +
    statsScore * 0.1;

  return Math.round(weighted * 100);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export const __testing = { detectFaqPattern, median, clamp, scoreCitability };
