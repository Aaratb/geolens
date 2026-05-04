/**
 * Live scan report. Server-rendered shell + client streaming view.
 * Forces the dark interactive surface (.surface-report) for this entire route.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScanHeader } from "@/lib/scan/queries";
import { ScanView } from "./scan-view";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const header = await getScanHeader(id);
  if (!header) notFound();

  return (
    <div className="surface-report min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Topbar url={header.url} hostname={header.hostname} />
        <ScanView scanId={id} initialBrand={header.brandName} initialCategory={header.category} />
      </div>
    </div>
  );
}

function Topbar({ url, hostname }: { url: string; hostname: string }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <Link href="/" className="flex items-center gap-2 text-[14px]">
        <span
          className="w-5 h-5 rounded-full grid place-items-center"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, var(--color-accent) 0%, var(--color-accent-deep) 35%, transparent 70%)",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
          }}
        >
          <span className="w-1 h-1 rounded-full bg-white" />
        </span>
        <span className="font-semibold">GEOlens</span>
      </Link>
      <div className="flex items-center gap-2 surface rounded-full px-3 py-1 text-[12px]">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent)" }} />
        <span className="font-mono-tabular">{hostname}</span>
        <span className="marginalia text-[10px] truncate max-w-[200px]" title={url}>
          {url}
        </span>
      </div>
    </div>
  );
}
