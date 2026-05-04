import Link from "next/link";
import { LensMark } from "@/components/brand/lens-mark";

/**
 * Mirrors the landing's masthead structure on the dark surface so scan routes
 * read as "different lighting on the same publication".
 */
export function ScanMasthead({
  url,
  hostname,
  auditNo,
  label = "Live",
}: {
  url: string;
  hostname: string;
  auditNo: string;
  label?: string;
}) {
  return (
    <header
      aria-label="GEOlens scan navigation"
      className="max-w-6xl mx-auto px-8 pt-8 rule-b pb-4 flex items-end justify-between"
    >
      <Link href="/" className="block group">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.18em] marginalia">
          Audit No. {auditNo} · {label}
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
