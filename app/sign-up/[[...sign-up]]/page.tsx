import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ redirect_url?: string }>;
}

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

export default async function SignUpPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const target = safeRedirect(redirect_url);
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
              Create account
            </div>
            <h1 className="font-display mt-4 text-[42px] font-semibold leading-[1.05] tracking-tight">
              Start saving your AI visibility audits.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.7] text-neutral-700">
              Create an account to keep your scan history, unlock full findings, and share reports
              with your team.
            </p>
          </div>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl={`/sign-in?redirect_url=${encodeURIComponent(target)}`}
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
