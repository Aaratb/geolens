"use client";

import { useEffect, useRef, useState } from "react";
import type { FixPackPayload } from "@/lib/fix-pack/schema";
import {
  parseFixPackGenerateResponse,
  parseFixPackStatusResponse,
} from "@/lib/fix-pack/client-response";
import {
  getFixPackActionState,
  getFixPackDownloadHref,
  type FixPackUiStatus,
} from "@/lib/fix-pack/ui-state";
import { trackFixPackClientEvent } from "@/lib/telemetry/client";
import { Button } from "@/components/ui/button";
import { WaitlistDialog } from "../waitlist-dialog";

const FETCH_TIMEOUT_MS = 15_000;
// 35 x 1200ms ~= 42s, leaving room under the 60s route maxDuration.
const POLL_ATTEMPTS = 35;
const POLL_INTERVAL_MS = 1200;

interface Props {
  scanId: string;
  eligible: boolean;
  initialStatus: FixPackUiStatus;
  initialPayload: FixPackPayload | null;
  initialFixPackId: string | null;
}

export function FixPackClient({
  scanId,
  eligible,
  initialStatus,
  initialPayload,
  initialFixPackId,
}: Props) {
  const [status, setStatus] = useState<FixPackUiStatus>(initialStatus);
  const [payload, setPayload] = useState<FixPackPayload | null>(initialPayload);
  const [fixPackId, setFixPackId] = useState<string | null>(initialFixPackId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const trackedInstallViewRef = useRef(false);
  const generateControllerRef = useRef<AbortController | null>(null);

  const action = getFixPackActionState({ eligible, status });
  const downloadHref = getFixPackDownloadHref(scanId);

  async function refreshPack(signal?: AbortSignal): Promise<FixPackUiStatus> {
    const { data: raw, res } = await fetchJson(`/api/v1/scans/${scanId}/fix-pack`, { signal });
    if (!res.ok) {
      throw new Error("Could not refresh Fix Pack.");
    }
    const data = parseStatusResponse(raw);
    if (!data.eligible) {
      setStatus("not_generated");
      setPayload(null);
      setFixPackId(null);
      return "not_generated";
    }
    setStatus(data.status);
    setPayload(data.fixPack);
    setFixPackId(data.fixPack?.id ?? null);
    return data.status;
  }

  async function pollUntilReady(signal?: AbortSignal) {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) return;
      await sleep(POLL_INTERVAL_MS, signal);
      if (signal?.aborted) return;
      const next = await refreshPack(signal);
      if (next !== "generating") return;
    }
    throw new Error("Generation is taking longer than expected. Please try again.");
  }

  useEffect(() => {
    if (initialStatus !== "generating") return;
    const controller = new AbortController();

    async function pollExistingGeneration() {
      try {
        await pollUntilReady(controller.signal);
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus(payload ? "completed" : "failed");
        setError(readableError(err, "Could not refresh Fix Pack."));
      }
    }

    void pollExistingGeneration();

    return () => {
      controller.abort();
    };
  }, [initialStatus]);

  useEffect(() => {
    if (!payload || status !== "completed") return;
    if (trackedInstallViewRef.current) return;
    trackedInstallViewRef.current = true;
    trackFixPackClientEvent({
      event: "fixpack.install.viewed",
      scanId,
      fixPackId: fixPackId ?? undefined,
      status,
      source: "install_panel",
      action: "view_install",
    });
  }, [fixPackId, payload, scanId, status]);

  useEffect(() => {
    return () => {
      generateControllerRef.current?.abort();
    };
  }, []);

  async function generatePack() {
    if (busy || status === "generating") return;
    trackFixPackClientEvent({
      event: "fixpack.cta.clicked",
      scanId,
      fixPackId: fixPackId ?? undefined,
      status,
      source: "fix_pack_page",
      action: "generate",
    });
    setBusy(true);
    setError(null);
    setStatus("generating");
    generateControllerRef.current?.abort();
    const controller = new AbortController();
    generateControllerRef.current = controller;
    try {
      const res = await fetch(`/api/v1/scans/${scanId}/fix-pack`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      });
      const data = parseGenerateResponse(await res.json());
      if (!res.ok || "error" in data) {
        throw new Error(
          "message" in data ? (data.message ?? "Fix Pack generation failed.") : "Fix Pack generation failed.",
        );
      }
      if (data.status === "generating") {
        await pollUntilReady(controller.signal);
      } else {
        await refreshPack(controller.signal);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus(payload ? "completed" : "failed");
      setError(readableError(err, "Could not generate Fix Pack."));
    } finally {
      if (generateControllerRef.current === controller) {
        generateControllerRef.current = null;
      }
      if (!controller.signal.aborted) {
        setBusy(false);
      }
    }
  }

  function onPrimaryAction() {
    if (!eligible) {
      trackFixPackClientEvent({
        event: "fixpack.waitlist.clicked",
        scanId,
        status,
        source: "fix_pack_page",
        action: "join_waitlist",
      });
      setWaitlistOpen(true);
      return;
    }
    void generatePack();
  }

  async function copyPrompt() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      trackFixPackClientEvent({
        event: "fixpack.prompt.copied",
        scanId,
        fixPackId: fixPackId ?? undefined,
        status,
        source: "agent_panel",
        action: "copy_prompt",
      });
    } catch {
      setError("Could not copy prompt. Select the text manually.");
    }
  }

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          {payload ? (
            <>
              <PromptPanel payload={payload} copied={copied} onCopyPrompt={copyPrompt} />
              {payload.cards.map((card, index) => (
                <article key={`${card.displayId}-${index}`} className="surface rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <span className="font-mono-tabular text-[11px] marginalia mt-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.2em] marginalia">
                        {card.displayId} · {card.assetKind.replaceAll("_", " ")}
                      </div>
                      <h2 className="font-display text-[22px] leading-tight font-semibold mt-2">
                        {card.title}
                      </h2>
                      <p className="text-[14px] marginalia leading-[1.7] mt-3">
                        {card.observedEvidence}
                      </p>
                      <p className="text-[14px] leading-[1.7] mt-3">{card.recommendedChange}</p>
                      <div className="mt-4 rounded-lg border border-[var(--rule)] bg-[var(--surface-muted)] p-3">
                        <pre className="whitespace-pre-wrap break-words font-mono-tabular text-[11px] leading-[1.6] marginalia">
                          {card.assetText}
                        </pre>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                        <Checklist title="Checklist" items={card.checklist} checked />
                        <Checklist title="Validation" items={card.validationSteps} />
                      </div>
                      {card.caveat ? (
                        <p className="text-[12px] marginalia leading-[1.6] mt-4">{card.caveat}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </>
          ) : (
            <EmptyFixPackState eligible={eligible} />
          )}
        </div>

        <aside className="surface rounded-xl p-5 h-fit lg:sticky lg:top-8">
          <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
            Agent Pack
          </div>
          <h2 className="font-display text-[22px] leading-tight font-semibold mt-2">
            Turn the scan into agent-ready work.
          </h2>
          <p className="text-[13px] marginalia leading-[1.7] mt-3">
            Generate the three highest-leverage fixes, then use the Markdown file in Claude Code,
            Cursor, or `AGENTS.md`.
          </p>
          <p className="text-[12px] marginalia leading-[1.6] mt-3">
            Fix cards and the agent file are AI-generated from your scan data. Review before
            applying.
          </p>
          {status === "completed" && eligible ? (
            <Button asChild variant="accent" className="w-full mt-5">
              <a
                href={downloadHref}
                onClick={() =>
                  trackFixPackClientEvent({
                    event: "fixpack.cta.clicked",
                    scanId,
                    fixPackId: fixPackId ?? undefined,
                    status,
                    source: "fix_pack_page",
                    action: "download",
                  })
                }
              >
                {action.label}
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant={action.tone === "outline" ? "outline" : "accent"}
              disabled={busy || action.disabled}
              onClick={onPrimaryAction}
              className="w-full mt-5"
            >
              {busy ? "Generating..." : action.label}
            </Button>
          )}
          {payload ? (
            <>
              <a
                href={downloadHref}
                onClick={() =>
                  trackFixPackClientEvent({
                    event: "fixpack.cta.clicked",
                    scanId,
                    fixPackId: fixPackId ?? undefined,
                    status,
                    source: "agent_panel",
                    action: "download",
                  })
                }
                className="block text-center text-[12px] mt-3 hover:underline"
                style={{ color: "var(--color-accent-soft)" }}
              >
                Direct download link
              </a>
              <InstallPanel payload={payload} />
            </>
          ) : null}
          {error ? (
            <div
              className="rounded-md px-3 py-2 text-[13px] mt-4"
              style={{
                background: "color-mix(in oklab, var(--color-score-bad) 15%, transparent)",
                color: "var(--color-score-bad-dark)",
              }}
            >
              {error}
            </div>
          ) : null}
          {status === "generating" ? (
            <p className="text-[12px] marginalia mt-4">
              Generation can take a moment. You can keep this tab open; we will refresh the pack
              automatically.
            </p>
          ) : null}
        </aside>
      </section>

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        scanId={scanId}
        source="fix_pack_cta"
      />
    </>
  );
}

async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ res: Response; data: unknown }> {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const res = await fetch(input, { ...init, signal });
  return { res, data: await res.json() };
}

function parseStatusResponse(input: unknown) {
  try {
    return parseFixPackStatusResponse(input);
  } catch {
    throw new Error("Unexpected response from server. Please refresh and try again.");
  }
}

function parseGenerateResponse(input: unknown) {
  try {
    return parseFixPackGenerateResponse(input);
  } catch {
    throw new Error("Unexpected response from server. Please refresh and try again.");
  }
}

function readableError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

function PromptPanel({
  payload,
  copied,
  onCopyPrompt,
}: {
  payload: FixPackPayload;
  copied: boolean;
  onCopyPrompt: () => void;
}) {
  return (
    <article className="surface rounded-xl p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
            Copy-paste prompt
          </div>
          <h2 className="font-display text-[22px] leading-tight font-semibold mt-2">
            Start your coding agent here.
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCopyPrompt}>
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
      <div className="mt-4 rounded-lg border border-[var(--rule)] bg-[var(--surface-muted)] p-3 max-h-72 overflow-auto">
        <pre className="whitespace-pre-wrap break-words font-mono-tabular text-[11px] leading-[1.6] marginalia">
          {payload.prompt}
        </pre>
      </div>
    </article>
  );
}

function InstallPanel({ payload }: { payload: FixPackPayload }) {
  return (
    <div className="rule-t mt-5 pt-5">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
        Install guide
      </div>
      <div className="space-y-4 mt-3">
        <InstallStep label="Claude Code" body={payload.install.claudeCode} />
        <InstallStep label="Cursor" body={payload.install.cursor} />
        <InstallStep label="AGENTS.md" body={payload.install.agentsMd} />
      </div>
      <ul className="space-y-1.5 text-[12px] marginalia mt-4">
        {payload.caveats.map((caveat, index) => (
          <li key={`caveat-${index}`}>- {caveat}</li>
        ))}
      </ul>
    </div>
  );
}

function InstallStep({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] marginalia">
        {label}
      </div>
      <p className="text-[12px] leading-[1.6] marginalia mt-1">{body}</p>
    </div>
  );
}

function EmptyFixPackState({ eligible }: { eligible: boolean }) {
  return (
    <div className="surface rounded-xl p-6">
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] marginalia">
        {eligible ? "Ready to generate" : "Beta access"}
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold mt-2">
        {eligible ? "Create the first Fix Pack for this scan." : "Join the Fix Pack waitlist."}
      </h2>
      <p className="text-[14px] marginalia leading-[1.7] mt-3">
        {eligible
          ? "GEOlens will turn the scan's top findings into copy-paste assets, validation steps, and an agent-ready Markdown file."
          : "Fix Pack is currently behind an allowlist. Join the list and we will prioritize access for this scan."}
      </p>
    </div>
  );
}

function Checklist({
  title,
  items,
  checked = false,
}: {
  title: string;
  items: string[];
  checked?: boolean;
}) {
  return (
    <div>
      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.2em] marginalia mb-2">
        {title}
      </div>
      <ul className="space-y-1.5 text-[13px] marginalia">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span aria-hidden>{checked ? "[ ]" : "-"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
