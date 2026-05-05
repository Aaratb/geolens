"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubmitForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    let normalized = url.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = `https://${normalized}`;
    }
    try {
      new URL(normalized);
    } catch {
      setError("Please enter a valid URL, e.g. yourbrand.com");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = (await res.json()) as { scanId?: string; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not start scan.");
        setSubmitting(false);
        return;
      }
      if (data.scanId) {
        router.push(`/scan/${data.scanId}`);
      } else {
        setError("Unexpected response. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-4 pb-3"
        style={{ borderBottom: "1.5px solid var(--ink)" }}
      >
        <span className="font-mono-tabular w-32 text-[12px] uppercase tracking-[0.18em] marginalia">
          Submit URL
        </span>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="yourbrand.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={submitting}
          className="font-display flex-1 bg-transparent pb-1 text-[22px] outline-none placeholder:text-neutral-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="font-display text-[16px] font-semibold underline-offset-4 hover:underline disabled:opacity-40"
        >
          {submitting ? "Starting..." : "Diagnose my site →"}
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-[13px] text-[color:var(--color-score-bad)]">{error}</p>
      ) : null}
    </div>
  );
}
