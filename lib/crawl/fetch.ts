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

    // Stream-cap the body to maxBytes
    const buf = await readCapped(res, maxBytes);
    if (buf === null) {
      return { ok: false, error: { kind: "too_large", bytes: maxBytes } };
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

/**
 * Read at most `maxBytes` from a Response stream. Returns null if the body
 * exceeds the cap (we abort and treat it as too_large).
 */
async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
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
  return out;
}

// Exported for tests; not used in app paths.
export const __testing = { MAX_REDIRECTS, readCapped };
