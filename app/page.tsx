/**
 * Landing page — Direction C (Editorial Audit).
 *
 * Phase 6 / M3.2 will replace this scaffold with the full editorial layout
 * matching .aw_docs/features/geolens/design/landing-direction-c.html.
 * For M1 we stand up the route + scaffold so deploy previews work end-to-end.
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
        Vol. 1 · Issue 01 · Beta
      </div>

      <h1 className="font-display mt-6 text-[56px] leading-[1.04] font-semibold tracking-tight">
        A second opinion on how AI<br />
        sees your site.
      </h1>

      <p className="mt-6 max-w-xl text-[17px] leading-[1.6] text-neutral-700">
        GEOlens audits your website the way Lighthouse audits its performance — but for the AI
        search era. We probe ChatGPT, Claude, Perplexity, and Gemini, then issue a numbered finding
        for every gap between how you describe yourself and how AI describes you.
      </p>

      <form
        className="mt-12 flex items-end gap-4 pb-3"
        style={{ borderBottom: "1.5px solid var(--ink)" }}
      >
        <span className="font-mono-tabular w-32 text-[12px] uppercase tracking-[0.18em] marginalia">
          Submit URL
        </span>
        <input
          type="text"
          placeholder="yourbrand.com"
          className="font-display flex-1 bg-transparent pb-1 text-[22px] outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="font-display text-[16px] font-semibold underline-offset-4 hover:underline"
        >
          Begin audit →
        </button>
      </form>

      <div className="marginalia mt-3 flex items-center gap-6 text-[12px]">
        <span><span className="font-mono-tabular">64</span> · average AEO score in our index</span>
        <span><span className="font-mono-tabular">23%</span> · sites with valid llms.txt</span>
        <span><span className="font-mono-tabular">0.0</span> · cost to begin</span>
      </div>

      <p className="marginalia mt-16 text-sm">
        <Link href="/methodology" className="hover:underline">
          Read the methodology →
        </Link>
      </p>
    </main>
  );
}
