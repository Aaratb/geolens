import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How GEOlens handles your data: lawful basis, retention, your rights under GDPR/CCPA, and our subprocessors.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">Privacy</div>
      <h1 className="font-display mt-4 text-[40px] font-semibold tracking-tight leading-[1.05]">
        Privacy notice.
      </h1>

      <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-neutral-700">
        Last updated 2026-05-04. GEOlens is operated by the GEOlens team (&quot;we&quot;, &quot;us&quot;).
        This notice explains what personal data we process, why, our lawful basis, your rights,
        and how to contact us. We hold ourselves to the same data hygiene we measure other sites against.
      </p>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Data we process</h2>
        <table className="w-full text-[14px] leading-[1.6] text-neutral-800 border-collapse">
          <thead>
            <tr className="rule-b">
              <th className="text-left py-2 pr-4 font-semibold">Category</th>
              <th className="text-left py-2 pr-4 font-semibold">Examples</th>
              <th className="text-left py-2 font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-neutral-700">
            <tr className="rule-b">
              <td className="py-2 pr-4">Account</td>
              <td className="py-2 pr-4">Email, Clerk user id</td>
              <td className="py-2">Sign-in, scan history, paid features</td>
            </tr>
            <tr className="rule-b">
              <td className="py-2 pr-4">Network</td>
              <td className="py-2 pr-4">SHA-256 hash of your IP (with rotating salt)</td>
              <td className="py-2">Rate limiting, ownership of anonymous scans</td>
            </tr>
            <tr className="rule-b">
              <td className="py-2 pr-4">Audit input</td>
              <td className="py-2 pr-4">URL you submit + URL hostname</td>
              <td className="py-2">Run the audit you requested</td>
            </tr>
            <tr className="rule-b">
              <td className="py-2 pr-4">Audit output</td>
              <td className="py-2 pr-4">SEO + AEO scores, finding text, AI engine probe responses</td>
              <td className="py-2">Display your report; let you re-open it later</td>
            </tr>
            <tr className="rule-b">
              <td className="py-2 pr-4">Telemetry</td>
              <td className="py-2 pr-4">Pseudonymous event id, scan/account id, event name</td>
              <td className="py-2">Product analytics (counts, errors, conversion)</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Waitlist</td>
              <td className="py-2 pr-4">Email + the gap that triggered the signup</td>
              <td className="py-2">Notify you when the fixer agent ships</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-12 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Lawful basis (GDPR Art. 6)</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li><strong>Contract (Art. 6(1)(b))</strong> — running scans, account features, paid PDF (when launched).</li>
          <li><strong>Consent (Art. 6(1)(a))</strong> — joining the waitlist with your email. You can withdraw at any time.</li>
          <li><strong>Legitimate interest (Art. 6(1)(f))</strong> — pseudonymous telemetry, IP-hash rate limiting, and abuse prevention. Balanced against your interest in privacy: we never store plaintext IPs and never sell or share telemetry with third parties.</li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">What we never store</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li><strong>Raw HTML of audited pages.</strong> Pages are fetched into memory only for the duration of a scan. We persist computed signals (scores, schema types present, hygiene results) but never the source HTML.</li>
          <li><strong>Plaintext IP addresses.</strong> We hash the IP with a rotating salt and store only the hash.</li>
          <li><strong>Cookies for tracking.</strong> We use only first-party cookies set by Clerk for authentication; no advertising or cross-site tracking cookies.</li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Retention</h2>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800">
          <li><strong>Anonymous scans</strong> — deleted 30 days after creation by an automated daily job.</li>
          <li><strong>Signed-in scans</strong> — retained until you delete them. Deleting your account removes all your scans.</li>
          <li><strong>Telemetry</strong> — kept up to 24 months for trend analysis, then aggregated and the row-level data is purged.</li>
          <li><strong>Waitlist email</strong> — kept until you unsubscribe (one-click link in any email we send) or 36 months of inactivity, whichever is sooner.</li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Your rights</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800 mb-2">
          Under GDPR, the UK Data Protection Act 2018, and CCPA where applicable, you have the right to:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-[15px] leading-[1.7] text-neutral-800">
          <li>Access a copy of your personal data</li>
          <li>Rectify inaccuracies</li>
          <li>Erase your data (&quot;right to be forgotten&quot;)</li>
          <li>Restrict our processing</li>
          <li>Object to legitimate-interest processing</li>
          <li>Receive your data in a portable format</li>
          <li>Withdraw consent (waitlist) at any time</li>
          <li>Lodge a complaint with your supervisory authority</li>
        </ul>
        <p className="text-[15px] leading-[1.7] text-neutral-800 mt-4">
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@geolens.xyz" className="underline">privacy@geolens.xyz</a>{" "}
          or delete your account directly from the dashboard. We respond within 30 days.
        </p>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Subprocessors &amp; international transfers</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          GEOlens uses the following processors. Several are based in the United States;
          transfers from the EEA/UK rely on the EU Commission&apos;s adequacy decision for the US (where applicable)
          or Standard Contractual Clauses (SCCs) included in each processor&apos;s data processing addendum.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[15px] leading-[1.7] text-neutral-800 mt-3">
          <li><strong>Vercel, Inc.</strong> (USA) — hosting, edge networking, image generation. SCCs.</li>
          <li><strong>Neon Inc.</strong> (USA) — managed Postgres for scans, findings, accounts. SCCs.</li>
          <li><strong>Upstash, Inc.</strong> (USA) — Redis for rate limiting. SCCs.</li>
          <li><strong>Clerk, Inc.</strong> (USA) — authentication and account management. SCCs.</li>
          <li><strong>OpenAI, Anthropic, Google (Gemini), Perplexity</strong> (USA) — AI engines we query through the Vercel AI Gateway. We send only the prompts described in our methodology, never your account data. SCCs in their respective DPAs.</li>
          <li><strong>Google LLC</strong> (USA) — PageSpeed Insights API for SEO scoring. SCCs.</li>
        </ul>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">AI-generated content</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          Reports include text generated by external AI engines (ChatGPT, Claude, Perplexity, Gemini)
          in response to our probe queries. This text is shown verbatim and is labelled as an AI engine
          probe response in the report. AI output may be inaccurate, incomplete, or biased; we surface it
          as a measurement of how AI sees your site, not as factual advice about your business.
        </p>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Data controller &amp; contact</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          Data controller: the GEOlens team. Reach us at{" "}
          <a href="mailto:privacy@geolens.xyz" className="underline">privacy@geolens.xyz</a>.
          If you are in the EEA/UK and are not satisfied with our response, you may contact your national
          data protection authority. Within the EEA, you may use the
          {" "}
          <a
            href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
            className="underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            EDPB members directory
          </a>
          .
        </p>
      </section>

      <section className="mt-10 rule-t pt-8">
        <h2 className="font-display text-[22px] font-semibold mb-3">Changes</h2>
        <p className="text-[15px] leading-[1.7] text-neutral-800">
          Material changes to this notice will be communicated by email to signed-in users and posted
          here at least 14 days before they take effect. The effective date at the top of this page
          tracks the latest revision.
        </p>
      </section>

      <p className="mt-12 marginalia text-sm">
        <Link href="/" className="hover:underline">← Back to GEOlens</Link>
      </p>
    </main>
  );
}
