/**
 * Route-level loading state. Renders the dark surface immediately so the
 * editorial → dark transition feels deliberate, not a jarring color flash.
 */
export default function Loading() {
  return (
    <div className="surface-report min-h-screen scan-fade-in">
      <header className="max-w-6xl mx-auto px-8 pt-8 rule-b pb-4 flex items-end justify-between">
        <div>
          <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
            Audit · Live
          </div>
          <div className="font-display text-[28px] font-semibold leading-none mt-1">GEOlens</div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-8 pt-10 pb-24">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--color-accent)" }}
          />
          opening report
        </div>
      </main>
    </div>
  );
}
