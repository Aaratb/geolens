/**
 * Validates the llms.txt and llms-full.txt presence + structure per the
 * llmstxt.org spec. Returns 1-3 HygieneChecks.
 *
 * Spec basics:
 *  - file lives at site root (/llms.txt)
 *  - markdown formatted, must start with H1 site name
 *  - optional H2 sections containing markdown link lists
 *  - optional /llms-full.txt with the full text content
 */
import type { HygieneCheck } from "../types";
import { DEFAULT_USER_AGENT } from "../../crawl/types";

interface CheckOptions {
  homepage: string;
  fetcher?: typeof fetch;
  userAgent?: string;
}

export async function checkLlmsTxt(opts: CheckOptions): Promise<HygieneCheck[]> {
  const fetcher = opts.fetcher ?? globalThis.fetch;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;

  const llmsUrl = new URL("/llms.txt", opts.homepage).toString();
  const llmsFullUrl = new URL("/llms-full.txt", opts.homepage).toString();

  const [llms, llmsFull] = await Promise.all([
    fetchText(llmsUrl, fetcher, userAgent),
    fetchText(llmsFullUrl, fetcher, userAgent),
  ]);

  const out: HygieneCheck[] = [];

  if (!llms.ok) {
    out.push({
      id: "llms-txt.present",
      category: "llms-txt",
      status: "fail",
      title: "No llms.txt at the root",
      why: "AI crawlers can't find a curated map of your site. The llms.txt spec lets you tell models which pages matter, in what order.",
      fixHint:
        "Add /llms.txt with a single H1 (your site name), one paragraph of summary, and H2 sections listing your most important pages as markdown links.",
      scoreImpact: 30,
      severity: "high",
      effort: "30min",
      meta: { url: llmsUrl, status: llms.status },
    });
    return out;
  }

  out.push({
    id: "llms-txt.present",
    category: "llms-txt",
    status: "pass",
    title: "llms.txt is present",
    why: "AI crawlers can find a curated map of your site.",
    scoreImpact: 30,
    severity: "low",
    meta: { url: llmsUrl, bytes: llms.text.length },
  });

  // Validate structural rules
  const lines = llms.text.split(/\r?\n/);
  const h1 = lines.find((l) => /^#\s+\S/.test(l));
  if (!h1) {
    out.push({
      id: "llms-txt.h1-required",
      category: "llms-txt",
      status: "fail",
      title: "llms.txt missing required H1",
      why: "Per the llms.txt spec, the file must begin with a single H1 containing the site name.",
      fixHint: "Add `# Your Brand Name` as the first non-empty line.",
      scoreImpact: 10,
      severity: "medium",
      effort: "30min",
    });
  }

  if (llmsFull.ok) {
    out.push({
      id: "llms-full-txt.present",
      category: "llms-txt",
      status: "pass",
      title: "llms-full.txt is present",
      why: "Full-text companion to llms.txt for models that prefer the entire content inline.",
      scoreImpact: 5,
      severity: "low",
      meta: { url: llmsFullUrl },
    });
  }

  return out;
}

async function fetchText(
  url: string,
  fetcher: typeof fetch,
  userAgent: string,
): Promise<{ ok: true; text: string; status: number } | { ok: false; status: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetcher(url, {
        headers: { "user-agent": userAgent, accept: "text/plain,text/markdown" },
        signal: controller.signal,
      });
      if (!res.ok) return { ok: false, status: res.status };
      const text = await res.text();
      return { ok: true, text, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, status: 0 };
  }
}
