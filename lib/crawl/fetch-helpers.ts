/**
 * Shared fetch helpers used by the crawler. Lives separate from fetch.ts so
 * robots.ts + discover.ts can use them without circular import.
 */

/**
 * Vercel Protection Bypass: when our function fetches its own production
 * alias (or Vercel deployment URL), Vercel's edge routing intercepts the
 * request because Deployment Protection is on by default. Sending this
 * header bypasses that auth.
 *
 * Set VERCEL_AUTOMATION_BYPASS_SECRET in Vercel env (auto-injected on Pro).
 */
export function selfFetchHeaders(targetUrl: string): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!secret) return {};
  try {
    const targetHost = new URL(targetUrl).hostname;
    const ourHosts = new Set<string>();
    if (siteUrl) ourHosts.add(new URL(siteUrl).hostname);
    if (vercelUrl) ourHosts.add(vercelUrl);
    if (ourHosts.has(targetHost)) {
      return {
        "x-vercel-protection-bypass": secret,
        "x-vercel-set-bypass-cookie": "samesitenone",
      };
    }
  } catch {
    /* non-url, ignore */
  }
  return {};
}
