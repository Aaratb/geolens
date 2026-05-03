/**
 * URL hygiene: validation, normalization, internal-link detection.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const PRIVATE_HOSTS = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1"]);

/**
 * Normalize a user-submitted URL string. Adds https:// if missing.
 * Returns null if the URL is invalid or private.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If the input already declares any protocol, parse it as-is and require
  // http/https. Otherwise prepend https:// for bare hostnames.
  const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (PRIVATE_HOSTS.has(parsed.hostname)) return null;
  if (parsed.hostname.endsWith(".local")) return null;
  // Reject IP literals
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) return null;

  parsed.hash = "";
  return parsed.toString();
}

/**
 * Canonical hash key for deduping scans of the same URL.
 * Strips fragment, lowercases hostname, drops trailing slash on path.
 */
export function canonicalUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * True if `candidate` is an internal link relative to `homepage`.
 * Considers same-host as internal; subdomains are external.
 */
export function isInternalLink(candidate: string, homepage: string): boolean {
  try {
    const a = new URL(candidate, homepage);
    const b = new URL(homepage);
    return a.hostname === b.hostname;
  } catch {
    return false;
  }
}

/**
 * Resolve a possibly-relative URL against the homepage and return the absolute
 * form. Returns null on parse failure.
 */
export function resolveAgainst(homepage: string, href: string): string | null {
  try {
    const u = new URL(href, homepage);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Strip URL query strings and fragments. Used when comparing equivalents
 * during page discovery dedupe.
 */
export function dropQueryAndHash(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}
