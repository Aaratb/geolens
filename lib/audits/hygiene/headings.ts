/**
 * Heading hygiene: H1 uniqueness, presence, hierarchy depth.
 */
import type { CheerioAPI } from "cheerio";
import type { HygieneCheck } from "../types";

export function checkHeadings($: CheerioAPI): HygieneCheck[] {
  const out: HygieneCheck[] = [];

  const h1s = $("h1");
  const h1Count = h1s.length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;

  if (h1Count === 0) {
    out.push({
      id: "headings.no-h1",
      category: "headings",
      status: "fail",
      title: "No H1 on the page",
      why: "Every page should have an H1 expressing what it's about. AI engines weight H1 heavily.",
      fixHint: "Add a single <h1> describing the page topic in plain language.",
      scoreImpact: 6,
      severity: "high",
      effort: "30min",
    });
  } else if (h1Count > 1) {
    out.push({
      id: "headings.multiple-h1",
      category: "headings",
      status: "warn",
      title: `${h1Count} H1 tags on the page`,
      why: "Multiple H1s confuse engines about what the page is primarily about.",
      fixHint: "Keep one H1; demote the rest to H2.",
      scoreImpact: 3,
      severity: "medium",
      effort: "30min",
    });
  } else {
    out.push({
      id: "headings.single-h1",
      category: "headings",
      status: "pass",
      title: "Single H1 declared",
      why: "Engines have a clear primary topic for the page.",
      scoreImpact: 6,
      severity: "low",
      meta: { h1: h1s.first().text().trim().slice(0, 200) },
    });
  }

  if (h2Count === 0 && h3Count > 0) {
    out.push({
      id: "headings.skipped-level",
      category: "headings",
      status: "warn",
      title: "H3 used without any H2 (skipped level)",
      why: "Skipping heading levels breaks the document outline AI engines build.",
      fixHint: "Use H2 for top-level sections; H3 only inside H2 sections.",
      scoreImpact: 3,
      severity: "low",
      effort: "30min",
    });
  }

  out.push({
    id: "headings.depth-ok",
    category: "headings",
    status: h2Count >= 2 ? "pass" : "warn",
    title:
      h2Count >= 2
        ? `Page has ${h2Count} H2 sections`
        : "Few or no H2 sections",
    why:
      h2Count >= 2
        ? "Section structure is legible to engines."
        : "Long pages without H2 structure are harder for engines to extract specific answers from.",
    fixHint:
      h2Count >= 2
        ? undefined
        : "Break long content into 3-7 H2 sections each summarizing one idea.",
    scoreImpact: 4,
    severity: "low",
    effort: "few-hours",
    meta: { h2: h2Count, h3: h3Count },
  });

  return out;
}
