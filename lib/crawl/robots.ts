/**
 * robots.txt fetching + checking. Permissive on errors — if robots.txt is
 * unreachable, we treat the site as crawlable per typical bot etiquette.
 */
import robotsParser from "robots-parser";
import { DEFAULT_USER_AGENT } from "./types";
import { selfFetchHeaders } from "./fetch-helpers";

export interface RobotsCheck {
  /** robots.txt body, or null if missing/unreachable. */
  text: string | null;
  /** Returns true if the given URL is allowed for our user agent. */
  isAllowed(url: string): boolean;
}

export async function fetchRobots(
  homepage: string,
  userAgent = DEFAULT_USER_AGENT,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<RobotsCheck> {
  let text: string | null = null;
  try {
    const robotsUrl = new URL("/robots.txt", homepage).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetcher(robotsUrl, {
        method: "GET",
        headers: {
          "user-agent": userAgent,
          ...selfFetchHeaders(robotsUrl),
        },
        signal: controller.signal,
        redirect: "follow",
      });
      if (res.ok) text = await res.text();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    text = null;
  }

  if (!text) {
    return { text: null, isAllowed: () => true };
  }

  // robots-parser expects the URL of the robots.txt itself
  const robotsUrl = new URL("/robots.txt", homepage).toString();
  const parsed = robotsParser(robotsUrl, text);

  return {
    text,
    isAllowed(url: string) {
      const allowed = parsed.isAllowed(url, userAgent);
      // robots-parser returns boolean | undefined; treat undefined as allowed
      return allowed !== false;
    },
  };
}
