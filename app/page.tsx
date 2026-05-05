/**
 * Landing — Direction C (Editorial Audit). Light theme.
 * The submit form is a client component; everything else is server-rendered.
 */
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { SubmitForm } from "./_landing/submit-form";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://geolens.xyz";

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GEOlens",
  url: SITE,
  logo: `${SITE}/logo.png`,
  description:
    "GEOlens diagnoses AI visibility for any public website — probes ChatGPT, Claude, Perplexity, and Gemini, then returns evidence-backed gap cards with first fixes.",
  sameAs: [],
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GEOlens",
  url: SITE,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE}/scan/{scan_id}` },
    "query-input": "required name=scan_id",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <Masthead />
      <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
          AI visibility diagnosis
        </div>
        <h1 className="font-display mt-4 text-[44px] md:text-[56px] leading-[1.04] font-semibold tracking-tight">
          See where AI misses<br />
          your brand.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-neutral-700">
          GEOlens checks what ChatGPT, Claude, Perplexity, and Gemini actually say about your site.
          You get evidence-backed diagnosis cards for missed citations, misread answers, and
          invisible pages.
        </p>
        <ReceiptSpecimen />

        <div className="mt-10">
          <SubmitForm />
        </div>

        <div className="marginalia mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
          <span>Free diagnosis preview · sign in for full evidence log + Fix Pack</span>
          <span>· No credit card</span>
        </div>

        <HowWeVerifyPanel />
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
        <SignedOut>
          <Link
            href="/sign-in"
            className="bg-[var(--ink)] text-[var(--bg)] px-3 py-1 text-[11px] tracking-[0.18em] uppercase"
          >
            Sign in
          </Link>
        </SignedOut>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: "h-7 w-7" } }}
          />
        </SignedIn>
      </nav>
    </header>
  );
}

function Specimen() {
  return (
    <section className="mt-24 grid grid-cols-12 gap-8">
      <aside className="col-span-3 hidden md:block">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">Diagnosis specimen</div>
        <div className="font-display text-[20px] mt-1 font-semibold">vercel.com</div>
        <div className="mt-4 text-[13px] marginalia leading-[1.5]">
          A sample diagnosis. Cards on the right mirror the format GEOlens generates for your site.
        </div>
        <div className="rule-t mt-8 pt-4 font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
          Visibility gaps
        </div>
        <div className="mt-3 space-y-2 text-[14px]">
          <Row k="Missed citations" v="3" tone="bad" />
          <Row k="Misread answers" v="2" tone="warn" />
          <Row k="Invisible pages" v="4" tone="warn" />
          <Row k="Citation rate" v="58%" tone="warn" />
          <Row k="AEO score" v="71" tone="warn" />
        </div>
      </aside>
      <div className="col-span-12 md:col-span-9 space-y-8">
        <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Diagnosis cards</h2>
        <DiagnosisCard
          id="GL-01"
          label="Missed citation"
          title={<>Perplexity cites competitors, not your site.</>}
          evidence='Query: "best platform for deployment previews." Perplexity cited two competitors and no URL from vercel.com.'
          consequence="High-intent buyers can discover alternatives before your brand appears in AI answers."
          firstFix="Publish an llms.txt map and add source-linked comparison content for deployment preview intent."
          scoreHint="+14 potential AEO lift"
        />
        <DiagnosisCard
          id="GL-02"
          label="Misread answer"
          title="AI attributes key product claims to docs pages with weak context."
          evidence='Gemini response paraphrased "edge deployment controls" but cited a changelog page with no canonical summary.'
          consequence="Your core positioning appears fragmented, reducing accuracy and trust in downstream summaries."
          firstFix="Create one canonical explainer page with schema, FAQ blocks, and explicit claim-to-source structure."
          scoreHint="+9 potential AEO lift"
        />
        <DiagnosisCard
          id="GL-03"
          label="Invisible page"
          title="High-value pages are indexed but rarely extracted."
          evidence="Only Organization schema was detected. Product, FAQPage, and Article schema are missing on pages with buying intent."
          consequence="AI engines discover your pages but extract less structured evidence than competing sources."
          firstFix="Add Product and FAQPage schema to key pages and tighten heading + list structure for extractability."
          scoreHint="+11 potential AEO lift"
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

function ReceiptSpecimen() {
  return (
    <section className="mt-10 surface rounded-md p-5 md:p-6">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
        Receipt specimen
      </div>
      <h2 className="font-display mt-2 text-[24px] font-semibold leading-tight">
        The exact AI response that missed your brand.
      </h2>
      <div className="mt-5 space-y-3 text-[14px] leading-[1.6]">
        <p>
          <span className="font-mono-tabular marginalia">Engine</span>: Perplexity
        </p>
        <p>
          <span className="font-mono-tabular marginalia">Query</span>: "Best platforms for deployment
          previews in 2026"
        </p>
        <p>
          <span className="font-mono-tabular marginalia">Answer excerpt</span>: "Top options include
          Platform A and Platform B for fast preview environments."
        </p>
        <p>
          <span className="font-mono-tabular marginalia">Citation status</span>: No citation to
          vercel.com
        </p>
        <p>
          <span className="font-mono-tabular marginalia">Captured</span>: 2026-05-05 12:14 UTC
        </p>
      </div>
    </section>
  );
}

function DiagnosisCard({
  id,
  label,
  title,
  evidence,
  consequence,
  firstFix,
  scoreHint,
}: {
  id: string;
  label: string;
  title: React.ReactNode;
  evidence: string;
  consequence: string;
  firstFix: string;
  scoreHint: string;
}) {
  return (
    <div className="rule-b pb-8">
      <div className="flex items-baseline gap-4">
        <span className="font-mono-tabular text-[12px] marginalia">#{id}</span>
        <span className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] marginalia">
          {label}
        </span>
      </div>
      <div className="mt-2">
        <h3 className="font-display text-[24px] md:text-[28px] font-semibold leading-[1.15]">{title}</h3>
      </div>
      <div className="mt-4 space-y-3 text-[15px] md:text-[16px] leading-[1.7] text-neutral-800 max-w-prose">
        <p>
          <span className="font-mono-tabular text-[12px] uppercase tracking-[0.14em] marginalia">
            Evidence
          </span>{" "}
          {evidence}
        </p>
        <p>
          <span className="font-mono-tabular text-[12px] uppercase tracking-[0.14em] marginalia">
            Why it matters
          </span>{" "}
          {consequence}
        </p>
        <p>
          <span className="font-mono-tabular text-[12px] uppercase tracking-[0.14em] marginalia">
            First fix
          </span>{" "}
          {firstFix}
        </p>
      </div>
      <div className="mt-4 font-mono-tabular text-[12px] marginalia">{scoreHint}</div>
    </div>
  );
}

function HowWeVerifyPanel() {
  return (
    <section className="mt-10 surface rounded-md p-5">
      <h2 className="font-display text-[24px] font-semibold">How we verify</h2>
      <ul className="mt-3 text-[14px] leading-[1.7] text-neutral-800 list-disc pl-5">
        <li>We run live prompts across ChatGPT, Claude, Perplexity, and Gemini.</li>
        <li>Each diagnosis card includes the query, response excerpt, and citation outcome.</li>
        <li>We timestamp captures and flag where engines disagree.</li>
        <li>We never persist raw HTML, only computed signals and findings.</li>
      </ul>
      <p className="mt-3 text-[13px] marginalia">
        Full scoring details remain open-book on{" "}
        <Link href="/methodology" className="underline underline-offset-2">
          Methodology
        </Link>
        .
      </p>
    </section>
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
          <div className="text-center">Receipts</div>
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
