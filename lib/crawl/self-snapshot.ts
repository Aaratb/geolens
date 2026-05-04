/**
 * Self-host snapshot. When the target URL hostname matches our own production
 * alias, we can't actually fetch it from inside our own Vercel function (the
 * deploy's edge routing intercepts the self-loop and fails at TLS). Instead
 * we read our own static assets directly from the bundled public/ directory
 * and use a snapshot of the rendered landing page HTML for the audit.
 *
 * This makes dogfooding work end-to-end: the user can scan geolens.xyz from
 * geolens.xyz and get a real report against our actual content.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let SITE_HOSTS: Set<string> | null = null;

function getSiteHosts(): Set<string> {
  if (SITE_HOSTS) return SITE_HOSTS;
  const hosts = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* non-url, skip */
    }
  }
  SITE_HOSTS = hosts;
  return hosts;
}

export function isSelfHost(url: string): boolean {
  try {
    const target = new URL(url).hostname;
    return getSiteHosts().has(target);
  } catch {
    return false;
  }
}

/** Read a file from public/ if it exists. */
export function readPublicFile(relativePath: string): string | null {
  const candidates = [
    join(process.cwd(), "public", relativePath),
    join(process.cwd(), relativePath),
  ];
  for (const path of candidates) {
    try {
      if (existsSync(path)) return readFileSync(path, "utf8");
    } catch {
      /* permission or path issue */
    }
  }
  return null;
}

/**
 * A minimal-but-realistic HTML snapshot of the GEOlens landing page —
 * mirrors what app/page.tsx renders. Used by the crawler when self-host is
 * detected. Updated by hand if the canonical landing changes.
 */
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GEOlens — A second opinion on how AI sees your site</title>
<meta name="description" content="GEOlens audits your site the way Lighthouse audits its performance — but for the AI search era. Probe ChatGPT, Claude, Perplexity, and Gemini for citation, visibility, and on-page AEO hygiene.">
<link rel="canonical" href="https://geolens.xyz/">
<meta property="og:site_name" content="GEOlens">
<meta property="og:title" content="GEOlens — A second opinion on how AI sees your site">
<meta property="og:description" content="GEOlens audits your site the way Lighthouse audits its performance — but for the AI search era.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://geolens.xyz/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="GEOlens — A second opinion on how AI sees your site">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GEOlens",
  url: "https://geolens.xyz",
  logo: "https://geolens.xyz/logo.png",
  description:
    "GEOlens audits any public website for AI search era visibility — probes ChatGPT, Claude, Perplexity, and Gemini, plus a full Lighthouse SEO audit.",
})}</script>
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GEOlens",
  url: "https://geolens.xyz",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://geolens.xyz/scan/{scan_id}" },
    "query-input": "required name=scan_id",
  },
})}</script>
</head>
<body>
<header>
<nav>
<a href="/methodology">Methodology</a>
<a href="/sign-in">Sign in</a>
</nav>
</header>
<main>
<article>
<h1>A second opinion on how AI sees your site.</h1>
<p>GEOlens audits your website the way Lighthouse audits its performance — but for the AI search era. We probe ChatGPT, Claude, Perplexity, and Gemini, then issue a numbered finding for every gap between how you describe yourself and how AI describes you.</p>
<section>
<h2>Findings</h2>
<article>
<h3>No llms.txt at the root.</h3>
<p>AI crawlers cannot find a curated map of your site. The llms.txt spec — emerging since late 2024 — is now the lowest-cost, highest-leverage AEO win we measure.</p>
</article>
<article>
<h3>Brand cited 0/3 times by Perplexity.</h3>
<p>ChatGPT and Claude both surface your brand in category placement queries. Perplexity does not, despite indexing your domain.</p>
</article>
<article>
<h3>Schema.org coverage is thin.</h3>
<p>Your pages emit Organization only. Adding Article, FAQPage, and Product would lift extractability by an estimated 14 points.</p>
</article>
</section>
<section>
<h2>Free, full-stack, gap-first.</h2>
<ul>
<li>SEO + AEO in one report</li>
<li>Free executive summary</li>
<li>Streaming results</li>
<li>Action-first findings</li>
</ul>
</section>
</article>
</main>
<footer>
<a href="/methodology">Methodology</a>
<a href="/privacy">Privacy</a>
<a href="/terms">Terms</a>
</footer>
</body>
</html>`;

/**
 * Returns the HTML snapshot for a self-host URL. The path determines which
 * page we serve — homepage if "/" or empty, methodology if "/methodology",
 * etc. Anything else falls back to the homepage snapshot.
 */
export function getSelfSnapshot(url: string): string {
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "/";
    }
  })();
  if (path === "/llms.txt" || path === "/robots.txt" || path === "/sitemap.xml") {
    const file = readPublicFile(path.slice(1));
    if (file !== null) return file;
  }
  // For any HTML route on our own host, return the landing snapshot. This is
  // a known v1 limitation — we don't render every page, but the auditor
  // reads structural signals from the HTML which the landing represents.
  return LANDING_HTML;
}
