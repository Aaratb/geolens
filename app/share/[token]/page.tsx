/**
 * Public read-only share view. Anyone with the link can view; no sign-in
 * required. Includes a soft "Run your own scan" CTA back to /.
 *
 * Direction A dark surface, same chrome as /scan/[id], minus the live
 * progress trail and any owner-only affordances.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveShareToken } from "@/lib/scan/share";
import { getScanWithDetails } from "@/lib/scan/queries";
import { GapCard } from "@/app/scan/[id]/gap-card";
import type { Gap } from "@/lib/score/gaps";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveShareToken(token);
  if (!resolved) return { title: "Shared scan" };
  const data = await getScanWithDetails(resolved.scanId);
  if (!data) return { title: "Shared scan" };
  return {
    title: `${data.header.brandName ?? data.header.hostname} · GEOlens audit`,
    description: `SEO ${data.header.scoreSeo} · AEO ${data.header.scoreAeo} · Citation rate ${data.header.citationRatePct}% across ChatGPT, Claude, Perplexity, Gemini.`,
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShareToken(token);
  if (!resolved) notFound();

  const data = await getScanWithDetails(resolved.scanId);
  if (!data) notFound();

  const { header, findings } = data;
  const auditNo = header.id.split("-")[0]?.toUpperCase().slice(0, 8) ?? "";
  const top3 = findings.filter((f) => f.isTop3);
  const rest = findings.filter((f) => !f.isTop3);

  return (
    <div className="surface-report min-h-screen scan-fade-in">
      {/* Same masthead structure as /scan/[id] */}
      <header className="max-w-6xl mx-auto px-8 pt-8 rule-b pb-4 flex items-end justify-between">
        <Link href="/" className="block">
          <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
            Audit No. {auditNo} · Shared
          </div>
          <div className="font-display text-[28px] font-semibold leading-none mt-1 flex items-center gap-3">
            <LensMark />
            <span>GEOlens</span>
          </div>
        </Link>
        <div className="hidden md:block text-right">
          <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
            Specimen
          </div>
          <div className="font-mono-tabular truncate max-w-[280px]" title={header.url}>
            {header.hostname}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 pt-10 pb-24 space-y-10">
        {/* Score tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Tile label="SEO score" value={header.scoreSeo} suffix="" />
          <Tile label="AEO score" value={header.scoreAeo} suffix="" />
          <Tile label="Citation rate" value={header.citationRatePct} suffix="%" />
        </div>

        {/* Top 3 */}
        <section>
          <SectionHeader eyebrow="Findings · Top 3" title="The three things to fix first." />
          <div className="space-y-2">
            {top3.map((f) => (
              <GapCard
                key={f.id}
                gap={
                  {
                    id: `GL-${String(f.ord).padStart(2, "0")}`,
                    ord: f.ord,
                    category: f.category,
                    severity: f.severity,
                    title: f.title,
                    why: f.why,
                    detail: f.detail ?? undefined,
                    fixHint: f.fixHint ?? undefined,
                    effort: (f.effort ?? undefined) as Gap["effort"],
                    scoreImpact: f.scoreImpact ?? 0,
                    isTop3: true,
                    _priority: 0,
                  } as Gap
                }
              />
            ))}
          </div>
        </section>

        {/* Drill-down (public for shared views) */}
        {rest.length > 0 ? (
          <section>
            <SectionHeader
              eyebrow="Findings · Drill-down"
              title="The full audit, in detail."
            />
            <div className="space-y-2">
              {rest.map((f) => (
                <GapCard
                  key={f.id}
                  gap={
                    {
                      id: `GL-${String(f.ord).padStart(2, "0")}`,
                      ord: f.ord,
                      category: f.category,
                      severity: f.severity,
                      title: f.title,
                      why: f.why,
                      detail: f.detail ?? undefined,
                      fixHint: f.fixHint ?? undefined,
                      effort: (f.effort ?? undefined) as Gap["effort"],
                      scoreImpact: f.scoreImpact ?? 0,
                      isTop3: false,
                      _priority: 0,
                    } as Gap
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="rule-t pt-8 text-center">
          <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
            Want a report like this?
          </div>
          <h2 className="font-display text-[28px] font-semibold mt-2">
            Run a free audit on your own site.
          </h2>
          <Link
            href="/"
            className="inline-block mt-6 px-5 py-2.5 rounded-md text-sm"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            Begin audit →
          </Link>
        </section>
      </main>
    </div>
  );
}

function LensMark() {
  return (
    <span
      className="w-5 h-5 rounded-full grid place-items-center shrink-0"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, var(--color-accent) 0%, var(--color-accent-deep) 35%, transparent 70%)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.6)" }}
      />
    </span>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 rule-b pb-3">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
        {eyebrow}
      </div>
      <h2
        className="font-display text-[20px] font-semibold leading-tight mt-1"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function Tile({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  if (value === null) return null;
  return (
    <div className="surface rounded-xl p-4">
      <div className="font-mono-tabular text-[11px] uppercase tracking-wider marginalia">{label}</div>
      <div
        className="mt-2 font-mono-tabular text-3xl font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}
