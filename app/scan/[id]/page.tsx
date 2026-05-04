/**
 * Live scan report. Server-rendered shell + client streaming view.
 * Forces the dark interactive surface (.surface-report) for this entire route.
 */
import { notFound } from "next/navigation";
import { getScanHeader } from "@/lib/scan/queries";
import { ScanView } from "./scan-view";
import { ScanMasthead } from "./scan-masthead";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const header = await getScanHeader(id);
  if (!header) notFound();

  // Short-form scan id for the editorial "Audit No." label
  const auditNo = id.split("-")[0]?.toUpperCase().slice(0, 8) ?? "";

  return (
    <div className="surface-report min-h-screen scan-fade-in">
      <ScanMasthead url={header.url} hostname={header.hostname} auditNo={auditNo} />
      <main className="max-w-3xl mx-auto px-8 pt-10 pb-24">
        <ScanView scanId={id} initialBrand={header.brandName} initialCategory={header.category} />
      </main>
    </div>
  );
}

