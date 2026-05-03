/**
 * Semantic HTML usage. Compute the ratio of semantic landmarks to total
 * structural tags as a rough proxy for how parseable the page is.
 */
import type { CheerioAPI } from "cheerio";
import type { HygieneCheck } from "../types";

const SEMANTIC = ["main", "article", "section", "nav", "header", "footer", "aside"];

export function checkSemantic($: CheerioAPI): HygieneCheck[] {
  const out: HygieneCheck[] = [];

  const semanticCount = SEMANTIC.reduce((acc, t) => acc + $(t).length, 0);
  const divs = $("div").length;
  // Density: semantic / (semantic + divs). 0 == all <div soup>; 1 == perfect.
  const density = semanticCount + divs === 0 ? 0 : semanticCount / (semanticCount + divs);
  const hasMain = $("main").length > 0;
  const hasNav = $("nav").length > 0;

  out.push({
    id: "semantic.main-landmark",
    category: "semantic",
    status: hasMain ? "pass" : "warn",
    title: hasMain ? "<main> landmark present" : "No <main> landmark",
    why: hasMain
      ? "Engines can isolate primary content from chrome."
      : "Engines have to guess where the primary content begins; this hurts citability.",
    fixHint: hasMain ? undefined : "Wrap the primary content of each page in <main>.",
    scoreImpact: 5,
    severity: "medium",
    effort: "30min",
  });

  out.push({
    id: "semantic.nav-landmark",
    category: "semantic",
    status: hasNav ? "pass" : "warn",
    title: hasNav ? "<nav> landmark present" : "No <nav> landmark",
    why: hasNav
      ? "Engines can identify and skip site navigation."
      : "Without <nav>, navigation links bleed into the content extraction.",
    fixHint: hasNav ? undefined : "Wrap site navigation in <nav>.",
    scoreImpact: 3,
    severity: "low",
    effort: "30min",
  });

  out.push({
    id: "semantic.density",
    category: "semantic",
    status: density >= 0.15 ? "pass" : density >= 0.05 ? "warn" : "fail",
    title:
      density >= 0.15
        ? "Healthy use of semantic HTML"
        : density >= 0.05
          ? "Light use of semantic HTML"
          : "Page is mostly <div> soup",
    why:
      density >= 0.15
        ? "Semantic landmarks help engines build a clean document outline."
        : "<div>-heavy markup makes content extraction unreliable for AI engines.",
    fixHint:
      density >= 0.15
        ? undefined
        : "Replace generic <div>s with <main>, <article>, <section>, <nav>, <header>, <footer> where they fit.",
    scoreImpact: 5,
    severity: density >= 0.15 ? "low" : "medium",
    effort: "few-hours",
    meta: { density: Number(density.toFixed(3)), semanticCount, divs },
  });

  return out;
}

export const __testing = { SEMANTIC };
