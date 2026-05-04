import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How GEOlens handles data: raw HTML never stored, IPs hashed, scans you control.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Privacy</div>
      <h1 className="font-display mt-4 text-[40px] font-semibold tracking-tight leading-[1.05]">
        What we keep, and what we don&apos;t.
      </h1>

      <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-neutral-700">
        Last updated 2026-05-04. GEOlens is a public website auditor. We hold ourselves to the
        same data hygiene we measure others against.
      </p>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">What we never store</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li>
            <strong>Raw HTML of audited pages.</strong> Pages are fetched into memory only
            for the duration of a scan. We persist computed signals (scores, schema types
            present, hygiene results) but never the source HTML.
          </li>
          <li>
            <strong>Plaintext IP addresses.</strong> We hash the IP with a rotating salt and
            store only the hash, used for rate limiting and to let anonymous scans claim
            ownership after sign-in.
          </li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">What we do store</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li>The submitted URL and hostname.</li>
          <li>Audit scores, finding text, and AI engine probe responses (so you can review them).</li>
          <li>Your account email if you sign in (managed by Clerk).</li>
          <li>
            Telemetry for product analytics: scan started/completed counts, error counts,
            UI events. We don&apos;t use third-party analytics in v1.
          </li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Retention</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          Anonymous scans are deleted 30 days after creation. Signed-in scans are retained
          until you delete them. Deleting your account removes your scans.
        </p>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Subprocessors</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li>Vercel — hosting and edge networking.</li>
          <li>Neon — managed Postgres for scans, findings, and accounts.</li>
          <li>Upstash — Redis for rate limiting and budget counters.</li>
          <li>Clerk — authentication and account management.</li>
          <li>OpenAI, Anthropic, Google, Perplexity — AI engines we query (via Vercel AI Gateway).</li>
          <li>Google PageSpeed Insights — Lighthouse-grade SEO audits.</li>
        </ul>
      </section>

      <p className="mt-12 marginalia text-sm">
        <Link href="/" className="hover:underline">← Back to GEOlens</Link>
      </p>
    </main>
  );
}
