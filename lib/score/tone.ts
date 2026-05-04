/**
 * Tone resolution for score values. Single source for the
 * "good / improving / weak" thresholds that were previously inlined in
 * score-tiles.tsx and gap-card.tsx.
 *
 * Phase 7 review (CR-M-3).
 */
export type ScoreTone = "good" | "warn" | "bad";

export interface ToneInfo {
  tone: ScoreTone;
  label: string;
  color: string;
}

export const TONE_COLOR_DARK: Record<ScoreTone, string> = {
  good: "var(--color-score-good-dark)",
  warn: "var(--color-score-warn-dark)",
  bad: "var(--color-score-bad-dark)",
};

export const TONE_COLOR_LIGHT: Record<ScoreTone, string> = {
  good: "var(--color-score-good)",
  warn: "var(--color-score-warn)",
  bad: "var(--color-score-bad)",
};

export const TONE_LABEL: Record<ScoreTone, string> = {
  good: "strong",
  warn: "improving",
  bad: "weak",
};

/**
 * Resolve a tone for a 0-100 score. The "kind" parameter lets callers pick
 * tighter or looser thresholds — e.g. citation rate is generally lower than
 * an SEO/AEO score so it has lower thresholds.
 */
export function toneFor(value: number, kind: "score" | "rate" = "score"): ToneInfo {
  const good = kind === "rate" ? 70 : 80;
  const ok = kind === "rate" ? 40 : 50;
  const tone: ScoreTone = value >= good ? "good" : value >= ok ? "warn" : "bad";
  return { tone, label: TONE_LABEL[tone], color: TONE_COLOR_DARK[tone] };
}
