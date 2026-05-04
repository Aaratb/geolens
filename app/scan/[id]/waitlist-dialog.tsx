"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanId?: string;
  gapId?: string;
  gapTitle?: string;
  source: "landing" | "gap_cta" | "share_view" | "pdf_stub" | "fix_pack_cta";
}

export function WaitlistDialog({ open, onOpenChange, scanId, gapId, gapTitle, source }: Props) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  const effectiveEmail = isSignedIn && userEmail ? userEmail : email;

  async function submit() {
    if (!effectiveEmail.trim() || busy) return;
    if (!isSignedIn && inputRef.current && !inputRef.current.checkValidity()) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: effectiveEmail.trim(),
          scanId,
          gapId,
          source,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not join waitlist.");
      } else {
        setDone(true);
        // Auto-close after a beat
        closeTimerRef.current = setTimeout(() => {
          onOpenChange(false);
          setDone(false);
          setEmail("");
        }, 1800);
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {gapTitle ? `Fix this for me` : "Join the GEOlens fixer-agent waitlist"}
          </DialogTitle>
          <DialogDescription>
            {gapTitle ? (
              <>
                We&apos;re building an autonomous agent that fixes findings like{" "}
                <span className="font-mono-tabular">{gapTitle}</span> end-to-end. Join the waitlist
                and we&apos;ll tag this gap to prioritize the rollout.
              </>
            ) : (
              <>
                We&apos;re building an autonomous agent that fixes the findings GEOlens surfaces.
                Join the waitlist for early access.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-3">
          {!isLoaded ? (
            <div className="h-10 surface rounded-md animate-pulse" />
          ) : isSignedIn ? (
            <div
              className="surface rounded-md px-3 py-2.5 text-sm"
              style={{ color: "var(--ink)" }}
            >
              <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
                Joining as
              </div>
              <div className="font-mono-tabular truncate">{userEmail}</div>
            </div>
          ) : (
            <Input
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@yourbrand.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || done}
              style={{ color: "var(--ink)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          )}

          {error ? (
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-score-bad) 15%, transparent)",
                color: "var(--color-score-bad-dark)",
              }}
            >
              {error}
            </div>
          ) : null}

          <Button
            variant="accent"
            disabled={busy || done || !effectiveEmail.trim()}
            onClick={submit}
            className="w-full"
          >
            {done ? (
              <>
                <Check className="h-4 w-4" /> You&apos;re on the list
              </>
            ) : busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Joining...
              </>
            ) : (
              <>Join the waitlist →</>
            )}
          </Button>

          <p className="text-[12px] marginalia">
            One email when there&apos;s news. No spam, no resale, no fluff.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
