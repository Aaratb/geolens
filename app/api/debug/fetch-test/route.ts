/**
 * Debug-only endpoint: tries a handful of outbound fetch strategies from
 * inside the Vercel runtime so we can see which (if any) work for the
 * self-loop case. Removed once the self-fetch flow is fixed.
 */
import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProbeResult {
  label: string;
  url: string;
  ok: boolean;
  status?: number;
  bytes?: number;
  ms: number;
  contentType?: string | null;
  error?: string;
}

async function probe(label: string, url: string, init?: RequestInit): Promise<ProbeResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "GEOlensBot/1.0 (+https://geolens.xyz/bot)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
      ...init,
    });
    const text = await res.text();
    return {
      label,
      url,
      ok: res.ok,
      status: res.status,
      bytes: text.length,
      contentType: res.headers.get("content-type"),
      ms: Date.now() - start,
    };
  } catch (err) {
    return {
      label,
      url,
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? `${err.name}: ${err.message}${err.cause ? " | cause=" + JSON.stringify(err.cause) : ""}` : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const probes: ProbeResult[] = [];

  // Direct fetches with the same UA the crawler uses
  probes.push(await probe("self-prod-domain", "https://geolens.xyz/"));
  probes.push(await probe(
    "self-deployment-url",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/` : "https://geolens.xyz/",
  ));
  probes.push(await probe("control-stripe", "https://stripe.com/"));
  probes.push(await probe("control-vercel", "https://vercel.com/"));

  // Self-fetch with Vercel Protection Bypass header
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    probes.push(
      await probe("self-prod-with-bypass", "https://geolens.xyz/", {
        headers: {
          "user-agent": "GEOlensBot/1.0 (+https://geolens.xyz/bot)",
          accept: "text/html,application/xhtml+xml",
          "x-vercel-protection-bypass": bypassSecret,
          "x-vercel-set-bypass-cookie": "samesitenone",
        } as HeadersInit,
      }),
    );
  }

  // DNS resolution of self-host
  let dnsRecords: Array<{ family: number; address: string }> = [];
  let dnsError: string | undefined;
  try {
    dnsRecords = await lookup("geolens.xyz", { all: true });
  } catch (err) {
    dnsError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    runtime: "nodejs",
    vercel_url: process.env.VERCEL_URL ?? null,
    vercel_region: process.env.VERCEL_REGION ?? null,
    bypass_secret_present: !!process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    bypass_secret_length: process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.length ?? 0,
    dns_geolens_xyz: dnsRecords,
    dns_error: dnsError,
    probes,
  });
}
