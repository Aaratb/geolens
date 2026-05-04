import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
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
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
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
