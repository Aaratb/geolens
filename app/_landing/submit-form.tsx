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
    try {
      const res = await fetch("/api/v1/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { scanId?: string; error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not start scan.");
        setSubmitting(false);
        return;
      }
      if (data.scanId) {
        router.push(`/scan/${data.scanId}`);
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
          {submitting ? "Starting..." : "Begin audit →"}
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-[13px] text-[color:var(--color-score-bad)]">{error}</p>
      ) : null}
    </div>
  );
}
