import Link from "next/link";

export const metadata = {
  title: "Methodology",
  description: "How GEOlens scores SEO and AEO. Open-book, market-aligned vocabulary.",
};

export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Methodology</div>
      <h1 className="font-display mt-4 text-[44px] font-semibold tracking-tight leading-[1.05]">
        How we score what AI sees.
      </h1>

      <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-neutral-700">
        GEOlens reports two top-line scores: <strong>SEO</strong> (classical, weighted Lighthouse) and{" "}
        <strong>AEO</strong> (Answer Engine Optimization, also called GEO). The vocabulary and weights
        below match the consensus that has emerged across the AEO tooling space since 2024.
      </p>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">SEO score</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          Hosted Lighthouse via Google PageSpeed Insights. Average across submitted URL plus up to 5
          internal pages. Per spec §6.1:
        </p>
        <ul className="mt-3 font-mono-tabular text-[13px] space-y-1">
          <li>Performance · 25%</li>
          <li>Accessibility · 25%</li>
          <li>Best Practices · 20%</li>
          <li>SEO · 30%</li>
        </ul>
      </section>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">AEO score</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          Three sub-scores combine into one AEO score:
        </p>
        <ul className="mt-3 font-mono-tabular text-[13px] space-y-1">
          <li>Engine Visibility · 60%</li>
          <li>AEO Hygiene · 25%</li>
          <li>Citability · 15%</li>
        </ul>

        <h3 className="font-display text-[18px] mt-6 mb-2">Engine Visibility</h3>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          We probe ChatGPT, Claude, Perplexity, and Gemini with three queries each:
        </p>
        <ul className="text-[15px] leading-[1.7] text-neutral-800 list-disc pl-6 mt-2">
          <li><em>Brand recall</em> — does the engine know the brand at all?</li>
          <li><em>Category placement</em> — does the engine list the brand in its category?</li>
          <li><em>Citation behavior</em> — does the engine cite the URL when asked about it?</li>
        </ul>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose mt-4">
          Each probe is parsed into structured fields and scored:
        </p>
        <pre className="font-mono-tabular text-[12px] surface rounded-md p-4 mt-3 overflow-x-auto">
{`probe_score = base × position × sentiment × accuracy

position:    primary 1.0  · secondary 0.7 · tertiary 0.4 · none 0.0
sentiment:   positive 1.2 · neutral   1.0 · negative   0.5
accuracy:    accurate 1.0 · partial   0.7 · misattrib  0.3`}
        </pre>

        <h3 className="font-display text-[18px] mt-6 mb-2">AEO Hygiene</h3>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          On-page checks aggregated to a 0–100 score: presence of <code>llms.txt</code>, robots.txt
          rules for major AI crawlers, JSON-LD coverage (Organization, WebSite, Article, FAQPage,
          Product), Open Graph and Twitter cards, heading hierarchy, semantic HTML density.
        </p>

        <h3 className="font-display text-[18px] mt-6 mb-2">Citability</h3>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          Quantitative content shape: clean-text-to-boilerplate ratio, paragraph and sentence length
          distribution, structured-list density, FAQ pattern detection (in JSON-LD or HTML),
          statistical density.
        </p>
      </section>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">What we don't do</h2>
        <ul className="text-[15px] leading-[1.7] text-neutral-800 list-disc pl-6">
          <li>Live Google AI Overviews probes (deferred; requires SerpAPI-class data)</li>
          <li>200M-prompt search-backed databases (deferred; that's incumbent moat)</li>
          <li>Continuous monitoring (one-shot reviewer for v1)</li>
          <li>Persist raw HTML beyond the scan (only computed signals; PRD §13)</li>
        </ul>
      </section>

      <p className="mt-12 marginalia text-sm">
        <Link href="/" className="hover:underline">← Back to GEOlens</Link>
      </p>
    </main>
  );
}
