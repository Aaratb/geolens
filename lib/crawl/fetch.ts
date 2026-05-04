/**
 * Per-page HTTP fetch with strict timeouts, byte caps, redirect limits, and
 * cheerio parsing. Returns a typed FetchResult — never throws.
 */
import { load } from "cheerio";
import { DEFAULT_USER_AGENT, type FetchResult } from "./types";
import { selfFetchHeaders } from "./fetch-helpers";

interface FetchOptions {
  url: string;
  timeoutMs: number;
  maxBytes: number;
  userAgent?: string;
  fetcher?: typeof fetch;
}

const MAX_REDIRECTS = 3;

export async function fetchPage({
  url,
  timeoutMs,
  maxBytes,
  userAgent = DEFAULT_USER_AGENT,
  fetcher = globalThis.fetch,
}: FetchOptions): Promise<FetchResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetcher(url, {
      method: "GET",
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        ...selfFetchHeaders(url),
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, error: { kind: "http_error", status: res.status } };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/(text\/html|application\/xhtml\+xml)/i.test(contentType)) {
      return { ok: false, error: { kind: "non_html", contentType } };
    }

    // Stream-cap the body to maxBytes. If the body exceeded the cap we
    // proceed with the truncated portion — every structural signal we audit
    // (title, meta, JSON-LD, headings, semantic landmarks) lives near the top
    // of the document, so partial HTML is still usable.
    const { bytes: buf } = await readCapped(res, maxBytes);
    if (buf.byteLength === 0) {
      return { ok: false, error: { kind: "network", message: "empty body" } };
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const $ = load(html);

    const fetchMs = Date.now() - start;
    return {
      ok: true,
      page: {
        url,
        finalUrl: res.url,
        statusCode: res.status,
        bytes: buf.byteLength,
        fetchMs,
        contentType,
        $,
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: { kind: "timeout", afterMs: timeoutMs } };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: "network", message } };
  } finally {
    clearTimeout(timer);
  }
}

interface CappedRead {
  bytes: Uint8Array;
  /** True if we stopped reading because we hit the cap. */
  truncated: boolean;
}

/**
 * Read up to `maxBytes` from a Response stream. If the body exceeds the cap
 * we keep what we already have and stop reading — the structural signals we
 * audit (title, meta, JSON-LD, headings) live in the first ~50KB on every
 * site, so a truncated read still yields a usable HTML fragment.
 */
async function readCapped(res: Response, maxBytes: number): Promise<CappedRead> {
  if (!res.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const remaining = maxBytes - total;
      if (remaining <= 0) {
        truncated = true;
        await reader.cancel();
        break;
      }
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        total += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }
      total += value.byteLength;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return { bytes: out, truncated };
}

// Exported for tests; not used in app paths.
export const __testing = { MAX_REDIRECTS, readCapped };
