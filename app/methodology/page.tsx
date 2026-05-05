import Link from "next/link";

export const metadata = {
  title: "Methodology",
  description: "How GEOlens verifies AI visibility diagnoses, evidence capture, and scoring details.",
};

export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Methodology</div>
      <h1 className="font-display mt-4 text-[44px] font-semibold tracking-tight leading-[1.05]">
        How we verify what AI says.
      </h1>

      <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-neutral-700">
        GEOlens is diagnosis-first. We capture what engines actually return, verify citation behavior,
        then turn those receipts into prioritized gap cards with first fixes. Scores stay visible, but
        evidence is the primary artifact.
      </p>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">How receipts are captured</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          For each scan, GEOlens probes ChatGPT, Claude, Perplexity, and Gemini using brand recall,
          category placement, and citation-focused prompts. Every diagnosis card is grounded in a query,
          answer excerpt, citation outcome, and capture timestamp.
        </p>
        <ul className="mt-3 text-[15px] leading-[1.7] text-neutral-800 list-disc pl-6">
          <li>Engine receipts are sampled live per scan run (not replayed from archives).</li>
          <li>Citation checks distinguish discovery gaps from trust/source gaps.</li>
          <li>Findings are normalized into plain categories: missed, misread, or invisible.</li>
        </ul>
      </section>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">What we score (secondary layer)</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          GEOlens still reports two top-line scores for orientation:
        </p>
        <ul className="mt-3 text-[15px] leading-[1.7] text-neutral-800 list-disc pl-6">
          <li>
            <strong>SEO</strong> from hosted Lighthouse via Google PageSpeed Insights.
          </li>
          <li>
            <strong>AEO</strong> from Engine Visibility, AEO Hygiene, and Citability signals.
          </li>
        </ul>
        <p className="mt-4 text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          We present gaps first because they are easier to act on than aggregate numbers.
        </p>
      </section>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[24px] font-semibold mb-3">Scoring details (open-book)</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 max-w-prose">
          Full weights and formulas remain transparent for teams that need the math.
        </p>
        <details className="mt-4 surface rounded-md p-4">
          <summary className="cursor-pointer font-mono-tabular text-[12px] uppercase tracking-[0.14em]">
            Expand exact weights and multiplier formula
          </summary>
          <div className="mt-4 space-y-4">
            <ul className="font-mono-tabular text-[13px] space-y-1">
              <li>SEO = Performance 25% · Accessibility 25% · Best Practices 20% · SEO 30%</li>
              <li>AEO = Engine Visibility 60% · AEO Hygiene 25% · Citability 15%</li>
            </ul>
            <pre className="font-mono-tabular text-[12px] surface rounded-md p-4 overflow-x-auto">
{`probe_score = base × position × sentiment × accuracy

position:    primary 1.0  · secondary 0.7 · tertiary 0.4 · none 0.0
sentiment:   positive 1.2 · neutral   1.0 · negative   0.5
accuracy:    accurate 1.0 · partial   0.7 · misattrib  0.3`}
            </pre>
          </div>
        </details>
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
