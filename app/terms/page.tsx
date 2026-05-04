import Link from "next/link";

export const metadata = {
  title: "Terms",
  description: "GEOlens terms of service and acceptable use.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Terms</div>
      <h1 className="font-display mt-4 text-[40px] font-semibold tracking-tight leading-[1.05]">
        Terms of service.
      </h1>
      <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-neutral-700">
        Last updated 2026-05-04.
      </p>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Use of GEOlens</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li>You may audit any publicly accessible website you own, operate, or have permission to audit.</li>
          <li>You may not use GEOlens to evaluate competitor sites for the purpose of harassment, defamation, or denial-of-service.</li>
          <li>We respect <code>robots.txt</code> and identify our crawler as <code>GEOlensBot/1.0</code>.</li>
          <li>Rate limits apply (2 anonymous scans/IP/24h, 10/account/24h). Don&apos;t try to circumvent them.</li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Liability</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          GEOlens reports are estimates derived from automated audits and AI probe responses.
          They are guidance, not certified accuracy. We make no warranties about the
          completeness or correctness of any report and are not liable for business decisions
          made on the basis of a GEOlens audit.
        </p>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Changes</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          We may change these terms as the product evolves. Material changes will be
          communicated via email to signed-in users.
        </p>
      </section>

      <p className="mt-12 marginalia text-sm">
        <Link href="/" className="hover:underline">← Back to GEOlens</Link>
      </p>
    </main>
  );
}
