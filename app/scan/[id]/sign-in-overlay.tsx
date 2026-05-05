"use client";

import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";
import { Lock } from "lucide-react";

interface Props {
  scanId: string;
}

/**
 * Anonymous-only overlay that gates the drill-down section. Routes the user
 * to the dedicated /sign-in page with a `redirect_url` so Clerk returns them
 * straight back to this report after auth (works for both first sign-up and
 * subsequent sign-ins). The dedicated page is the right surface for OAuth —
 * an embedded <SignIn /> inside <SignedOut /> unmounts mid-callback when the
 * Clerk session hydrates, which kills the transition silently.
 */
export function SignInOverlay({ scanId }: Props) {
  const redirectUrl = `/scan/${scanId}`;
  const href = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
  return (
    <SignedOut>
      <div className="absolute inset-x-0 bottom-0 pointer-events-auto">
        <div className="px-3 pb-4 pt-16 bg-gradient-to-b from-transparent via-[rgba(10,10,11,0.82)] to-[rgba(10,10,11,0.96)]">
          <div className="mx-auto w-fit text-center">
            <p className="marginalia mb-2 text-[12px]">Unlock full drill-down diagnostics and Fix Pack actions.</p>
            <Link
              href={href}
              prefetch={false}
              className="surface rounded-xl px-4 py-2.5 text-[13px] inline-flex items-center gap-2 hover:opacity-90"
            >
              <Lock className="h-3.5 w-3.5" />
              Sign in to unlock the full report
            </Link>
          </div>
        </div>
      </div>
    </SignedOut>
  );
}
