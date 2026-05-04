"use client";

/**
 * Top-level error boundary. Without this, runtime errors from server
 * components (Drizzle/Neon, Clerk, missing env) bubble to the user as raw
 * stack traces. This catches any uncaught render-path error and shows a
 * friendly retry. (Phase 7 review: REL-C-3)
 */
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen grid place-items-center px-8">
      <div className="max-w-md w-full">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] marginalia">
          Error
        </div>
        <h1 className="font-display mt-4 text-[40px] font-semibold tracking-tight leading-[1.05]">
          Something went sideways.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-neutral-700">
          An unexpected error stopped this page from rendering. The team has been notified.
          You can try again, head back home, or read the methodology while we&apos;re sorting it.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono-tabular text-[11px] marginalia">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex items-center gap-4 text-[14px]">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-md font-semibold"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            Try again
          </button>
          <Link href="/" className="hover:underline">
            ← Home
          </Link>
          <Link href="/methodology" className="hover:underline marginalia">
            Methodology
          </Link>
        </div>
      </div>
    </main>
  );
}
