/**
 * Landing — Direction C (Editorial Audit). Light theme.
 * The submit form is a client component; everything else is server-rendered.
 */
import Link from "next/link";
import { SubmitForm } from "./_landing/submit-form";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Masthead />
      <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
          An audit of how AI sees your site
        </div>
        <h1 className="font-display mt-4 text-[44px] md:text-[56px] leading-[1.04] font-semibold tracking-tight">
          A second opinion on how AI<br />
          sees your site.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-neutral-700">
          GEOlens audits your website the way Lighthouse audits its performance — but for the AI
          search era. We probe ChatGPT, Claude, Perplexity, and Gemini, then issue a numbered
          finding for every gap between how you describe yourself and how AI describes you.
        </p>

        <div className="mt-12">
          <SubmitForm />
        </div>

        <div className="marginalia mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
          <span><span className="font-mono-tabular">64</span> · average AEO score in our index</span>
          <span><span className="font-mono-tabular">23%</span> · sites with valid llms.txt</span>
          <span><span className="font-mono-tabular">0.0</span> · cost to begin</span>
        </div>

        <Specimen />
        <Comparison />
      </main>
      <Footer />
    </div>
  );
}

function Masthead() {
  return (
    <header className="max-w-6xl mx-auto px-8 pt-8 rule-b pb-4 flex items-end justify-between">
      <div>
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
          Vol. 1 · Issue 01 · Beta
        </div>
        <div className="font-display text-[28px] font-semibold leading-none mt-1">GEOlens</div>
      </div>
      <nav className="flex items-center gap-6 text-[13px]">
        <Link href="/methodology" className="hover:underline">Methodology</Link>
        <Link href="/sign-in" className="bg-[var(--ink)] text-[var(--bg)] px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
          Sign in
        </Link>
      </nav>
    </header>
  );
}

function Specimen() {
  return (
    <section className="mt-24 grid grid-cols-12 gap-8">
      <aside className="col-span-3 hidden md:block">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">Specimen</div>
        <div className="font-display text-[20px] mt-1 font-semibold">vercel.com</div>
        <div className="mt-4 text-[13px] marginalia leading-[1.5]">
          A live sample audit. Numbered findings on the right are the same format your report will produce.
        </div>
        <div className="rule-t mt-8 pt-4 font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">At-a-glance</div>
        <div className="mt-3 space-y-2 text-[14px]">
          <Row k="SEO" v="94" tone="good" />
          <Row k="AEO" v="71" tone="warn" />
          <Row k="Citation rate" v="58%" tone="warn" />
          <Row k="Hygiene" v="62" tone="warn" />
          <Row k="Citability" v="82" tone="good" />
        </div>
      </aside>
      <div className="col-span-12 md:col-span-9 space-y-8">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Findings</div>
        <Finding
          id="GL-01"
          title={<>No <span className="font-mono-tabular">llms.txt</span> at the root.</>}
          body="AI crawlers cannot find a curated map of your site. The llms.txt spec — emerging since late 2024 — is now the lowest-cost, highest-leverage AEO win we measure. Affected: every probed engine."
          severity="high"
          effort="30 min"
          impact="+14"
        />
        <Finding
          id="GL-02"
          title={<>Brand cited <span className="font-mono-tabular">0/3</span> times by Perplexity.</>}
          body="ChatGPT and Claude both surface your brand in category placement queries. Perplexity does not, despite indexing your domain — suggesting a citation source-trust gap rather than a discovery gap."
          severity="medium"
          effort="1–2 weeks"
          impact="+9"
        />
        <Finding
          id="GL-03"
          title="Schema.org coverage is thin."
          body="Your pages emit Organization only. Adding Article, FAQPage, and Product would lift extractability by an estimated 14 points across all four probe engines."
          severity="medium"
          effort="2–3 days"
          impact="+11"
        />
      </div>
    </section>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone: "good" | "warn" | "bad" }) {
  const color =
    tone === "good"
      ? "text-[color:var(--color-score-good)]"
      : tone === "warn"
        ? "text-[color:var(--color-score-warn)]"
        : "text-[color:var(--color-score-bad)]";
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className={`font-mono-tabular ${color}`}>{v}</span>
    </div>
  );
}

function Finding({
  id,
  title,
  body,
  severity,
  effort,
  impact,
}: {
  id: string;
  title: React.ReactNode;
  body: string;
  severity: string;
  effort: string;
  impact: string;
}) {
  return (
    <div className="rule-b pb-8">
      <div className="flex items-baseline gap-4">
        <span className="font-mono-tabular text-[12px] marginalia">#{id}</span>
        <h3 className="font-display text-[24px] md:text-[28px] font-semibold leading-[1.15]">{title}</h3>
      </div>
      <p className="mt-3 text-[15px] md:text-[16px] leading-[1.7] text-neutral-800 max-w-prose">{body}</p>
      <div className="mt-4 font-mono-tabular text-[12px] marginalia">
        Severity {severity} · Estimated effort {effort} · Score impact {impact}
      </div>
    </div>
  );
}

function Comparison() {
  return (
    <section className="mt-20">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">vs the dashboard tools</div>
      <h2 className="font-display mt-2 text-[22px] font-semibold">Free, full-stack, gap-first.</h2>
      <div className="mt-6 surface rounded-md overflow-hidden">
        <div className="grid grid-cols-5 px-5 py-3 text-[12px] marginalia rule-b">
          <div>Tool</div>
          <div className="text-center">SEO + AEO</div>
          <div className="text-center">Free tier</div>
          <div className="text-center">Streaming</div>
          <div className="text-center">Action-first</div>
        </div>
        <CompareRow tool="GEOlens" cells={[true, true, true, true]} bold />
        <CompareRow tool="Profound" cells={[false, false, false, true]} />
        <CompareRow tool="Ahrefs Brand Radar" cells={[false, false, false, false]} />
        <CompareRow tool="HubSpot AEO Grader" cells={[false, true, false, false]} />
      </div>
    </section>
  );
}

function CompareRow({ tool, cells, bold }: { tool: string; cells: boolean[]; bold?: boolean }) {
  return (
    <div className={`grid grid-cols-5 px-5 py-3 text-sm items-center rule-b last:border-b-0 ${bold ? "" : "marginalia"}`}>
      <div className={bold ? "font-medium" : ""}>{tool}</div>
      {cells.map((c, i) => (
        <div key={i} className={`text-center ${c ? "text-[color:var(--color-score-good)]" : ""}`}>
          {c ? "✓" : "—"}
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-8 mt-12 py-8 rule-t text-[12px] marginalia flex items-center justify-between">
      <div>© 2026 GEOlens · A reviewer for the AI search era</div>
      <div className="flex items-center gap-5">
        <Link href="/methodology" className="hover:underline">Methodology</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:underline">Terms</Link>
      </div>
    </footer>
  );
}
