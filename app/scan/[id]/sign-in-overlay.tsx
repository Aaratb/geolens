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
      <div className="absolute inset-0 grid place-items-center pointer-events-auto">
        <Link
          href={href}
          prefetch={false}
          className="surface rounded-xl px-4 py-2.5 text-[13px] flex items-center gap-2 hover:opacity-90"
        >
          <Lock className="h-3.5 w-3.5" />
          Sign in to unlock the full report
        </Link>
      </div>
    </SignedOut>
  );
}
