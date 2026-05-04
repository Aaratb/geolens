"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  scanId: string;
  /** True when the requester owns this scan and the scan has completed. */
  enabled: boolean;
}

export function ShareButton({ scanId, enabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function mintShare() {
    if (!enabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      const data = (await res.json()) as { url?: string; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not create share link.");
        setOpen(true);
        setBusy(false);
        return;
      }
      if (data.url) {
        setShareUrl(data.url);
        setOpen(true);
      }
    } catch {
      setError("Network error — please try again.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — user can select-and-copy manually
    }
  }

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={mintShare}
        disabled={busy}
        className="surface rounded-full px-3 py-1.5 text-[12px] flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        style={{ color: "var(--ink)" }}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
        Share
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this audit</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the report. The OG preview shows the score
              tiles. Revoke any time from your dashboard.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div
              className="mt-4 rounded-md p-3 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-score-bad) 15%, transparent)",
                color: "var(--color-score-bad-dark)",
              }}
            >
              {error}
            </div>
          ) : shareUrl ? (
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 surface rounded-md px-3 py-2 text-[13px] font-mono-tabular truncate"
                  style={{ color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-md px-3 py-2 text-[13px] flex items-center gap-1.5"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
