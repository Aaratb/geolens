/**
 * Live scan report. Server-rendered shell + client streaming view.
 * Forces the dark interactive surface (.surface-report) for this entire route.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScanHeader } from "@/lib/scan/queries";
import { LensMark } from "@/components/brand/lens-mark";
import { ScanView } from "./scan-view";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const header = await getScanHeader(id);
  if (!header) notFound();

  // Short-form scan id for the editorial "Audit No." label
  const auditNo = id.split("-")[0]?.toUpperCase().slice(0, 8) ?? "";

  return (
    <div className="surface-report min-h-screen scan-fade-in">
      <Masthead url={header.url} hostname={header.hostname} auditNo={auditNo} />
      <main className="max-w-3xl mx-auto px-8 pt-10 pb-24">
        <ScanView scanId={id} initialBrand={header.brandName} initialCategory={header.category} />
      </main>
    </div>
  );
}

/**
 * Mirrors the landing's masthead structure on the dark surface so the two
 * pages read as "different lighting on the same publication". Same eyebrow,
 * wordmark, divider rule, just on dark tokens.
 */
function Masthead({
  url,
  hostname,
  auditNo,
}: {
  url: string;
  hostname: string;
  auditNo: string;
}) {
  return (
    <header className="max-w-6xl mx-auto px-8 pt-8 rule-b pb-4 flex items-end justify-between">
      <Link href="/" className="block group">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
          Audit No. {auditNo} · Live
        </div>
        <div className="font-display text-[28px] font-semibold leading-none mt-1 flex items-center gap-3">
          <LensMark />
          <span>GEOlens</span>
        </div>
      </Link>
      <div className="flex items-center gap-3 text-[13px]">
        <div className="hidden md:block text-right">
          <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
            Specimen
          </div>
          <div className="font-mono-tabular truncate max-w-[280px]" title={url}>
            {hostname}
          </div>
        </div>
        <Link
          href="/methodology"
          className="hover:underline marginalia text-[12px] hidden md:inline"
        >
          Methodology
        </Link>
      </div>
    </header>
  );
}

