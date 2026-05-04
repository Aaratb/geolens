import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ redirect_url?: string }>;
}

/**
 * Sanitize redirect_url to a same-origin path. Defends against open-redirect
 * by rejecting absolute URLs, protocol-relative URLs, and anything that isn't
 * a leading `/` path.
 */
function safeRedirect(raw: string | undefined): string {
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

export default async function SignInPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const target = safeRedirect(redirect_url);
  // Pass `target` to BOTH redirect props so:
  //   - a fresh sign-in lands on the scan page (forceRedirectUrl)
  //   - an already-signed-in user lands on the scan page too (fallbackRedirectUrl)
  // Clerk picks fallbackRedirectUrl when the user is already authenticated and
  // hits this page — without it, they'd be sent to "/" by default.
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <Link
          href="/"
          className="font-display text-[28px] font-semibold leading-none"
        >
          GEOlens
        </Link>
        <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="max-w-md">
            <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
              Account access
            </div>
            <h1 className="font-display mt-4 text-[42px] font-semibold leading-[1.05] tracking-tight">
              Sign in to unlock your full report.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.7] text-neutral-700">
              Save scan history, claim anonymous audits, and export shareable reports from one
              account.
            </p>
          </div>
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(target)}`}
            forceRedirectUrl={target}
            fallbackRedirectUrl={target}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-2xl",
              },
            }}
          />
        </section>
      </div>
    </main>
  );
}
