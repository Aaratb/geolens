/**
 * Meta hygiene: title, description, canonical, hreflang, OpenGraph, Twitter.
 * One HygieneCheck per concept; deduped if identical issues recur.
 */
import type { CheerioAPI } from "cheerio";
import type { HygieneCheck } from "../types";

export function checkMeta($: CheerioAPI): HygieneCheck[] {
  const out: HygieneCheck[] = [];

  const title = $("head > title").first().text().trim();
  out.push(
    title.length === 0
      ? {
          id: "meta.title-missing",
          category: "meta",
          status: "fail",
          title: "<title> is empty or missing",
          why: "Title is the single most important AEO signal for what a page is about.",
          fixHint: "Add a unique <title> 30-60 chars long.",
          scoreImpact: 8,
          severity: "critical",
          effort: "30min",
        }
      : title.length < 20 || title.length > 80
        ? {
            id: "meta.title-length",
            category: "meta",
            status: "warn",
            title: `<title> length is ${title.length} chars (ideal 30-60)`,
            why: "Very short titles look spammy; very long titles get truncated by engines.",
            fixHint: "Aim for 30-60 characters.",
            scoreImpact: 4,
            severity: "low",
            effort: "30min",
          }
        : {
            id: "meta.title-ok",
            category: "meta",
            status: "pass",
            title: "<title> length is in the ideal range",
            why: "Title is well sized for engine display.",
            scoreImpact: 8,
            severity: "low",
          },
  );

  const desc = $("head > meta[name='description']").attr("content")?.trim() ?? "";
  out.push(
    !desc
      ? {
          id: "meta.description-missing",
          category: "meta",
          status: "fail",
          title: "Missing meta description",
          why: "Engines (and AI summaries) often surface this verbatim. Without it they invent a guess.",
          fixHint: "Add <meta name='description' content='...'> 120-160 chars.",
          scoreImpact: 6,
          severity: "high",
          effort: "30min",
        }
      : desc.length < 60 || desc.length > 200
        ? {
            id: "meta.description-length",
            category: "meta",
            status: "warn",
            title: `meta description is ${desc.length} chars (ideal 120-160)`,
            why: "Very short or very long descriptions reduce engine display fidelity.",
            fixHint: "Aim for 120-160 characters.",
            scoreImpact: 3,
            severity: "low",
            effort: "30min",
          }
        : {
            id: "meta.description-ok",
            category: "meta",
            status: "pass",
            title: "Meta description is in the ideal range",
            why: "Engines and AI summaries can use it verbatim.",
            scoreImpact: 6,
            severity: "low",
          },
  );

  const canonical = $("head > link[rel='canonical']").attr("href")?.trim();
  out.push(
    canonical
      ? {
          id: "meta.canonical-ok",
          category: "meta",
          status: "pass",
          title: "Canonical URL declared",
          why: "Disambiguates duplicate URLs for engines and AI crawlers.",
          scoreImpact: 4,
          severity: "low",
          meta: { canonical },
        }
      : {
          id: "meta.canonical-missing",
          category: "meta",
          status: "warn",
          title: "Missing canonical URL",
          why: "Without a canonical, engines may index multiple variants of the same page.",
          fixHint: "Add <link rel='canonical' href='...'> to <head>.",
          scoreImpact: 4,
          severity: "medium",
          effort: "30min",
        },
  );

  const hasOgTitle = !!$("head > meta[property='og:title']").attr("content");
  const hasOgDesc = !!$("head > meta[property='og:description']").attr("content");
  const hasOgImage = !!$("head > meta[property='og:image']").attr("content");
  const ogScore = [hasOgTitle, hasOgDesc, hasOgImage].filter(Boolean).length;
  out.push({
    id: "meta.opengraph",
    category: "meta",
    status: ogScore === 3 ? "pass" : ogScore >= 1 ? "warn" : "fail",
    title:
      ogScore === 3
        ? "Open Graph tags complete"
        : ogScore === 0
          ? "No Open Graph tags found"
          : "Open Graph tags incomplete",
    why: "OG tags drive how your site appears when shared in chat, social, and AI tool surfaces.",
    fixHint:
      ogScore === 3
        ? undefined
        : "Add og:title, og:description, og:image (and og:url, og:type for full coverage).",
    scoreImpact: 6,
    severity: ogScore === 0 ? "high" : "medium",
    effort: "30min",
    meta: { ogTitle: hasOgTitle, ogDescription: hasOgDesc, ogImage: hasOgImage },
  });

  const twitterCard = $("head > meta[name='twitter:card']").attr("content");
  out.push({
    id: "meta.twitter-card",
    category: "meta",
    status: twitterCard ? "pass" : "warn",
    title: twitterCard ? "Twitter card declared" : "No Twitter card declared",
    why: "Twitter / X uses card metadata to render link previews; AI engines occasionally fall back to it.",
    fixHint: twitterCard ? undefined : "Add <meta name='twitter:card' content='summary_large_image'>.",
    scoreImpact: 2,
    severity: "low",
    effort: "30min",
  });

  return out;
}
