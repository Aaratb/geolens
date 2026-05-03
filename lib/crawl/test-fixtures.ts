/**
 * Fixture-based mock fetch for crawl tests. Builds a typed registry of
 * (url -> Response factory) so tests can assert deterministically.
 */

export interface FixtureEntry {
  status?: number;
  contentType?: string;
  body?: string | Uint8Array;
  delayMs?: number;
  /** If true, the mock will hang until aborted (used for timeout tests). */
  hang?: boolean;
}

export type FixtureMap = Record<string, FixtureEntry>;

export function makeMockFetch(fixtures: FixtureMap): typeof fetch {
  const mock: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const fx = fixtures[url];

    if (fx?.hang) {
      // Wait until aborted, mirroring real network hang
      await new Promise<void>((_, reject) => {
        const onAbort = () => reject(new DOMException("aborted", "AbortError"));
        if (init?.signal?.aborted) onAbort();
        else init?.signal?.addEventListener("abort", onAbort);
      });
    }

    if (!fx) {
      return new Response("not found", { status: 404 });
    }

    if (fx.delayMs) await new Promise((r) => setTimeout(r, fx.delayMs));

    const headers = new Headers();
    headers.set("content-type", fx.contentType ?? "text/html; charset=utf-8");
    const body: BodyInit =
      fx.body instanceof Uint8Array
        ? new Blob([new Uint8Array(fx.body)])
        : (fx.body ?? "");
    return new Response(body, {
      status: fx.status ?? 200,
      headers,
    });
  };
  return mock;
}

export const HOMEPAGE_HTML = `<!doctype html>
<html><head>
  <title>Acme Corp · Best Widgets Online</title>
  <meta name="description" content="Acme Corp ships premium widgets.">
  <link rel="canonical" href="https://acme.example/">
</head><body>
  <nav>
    <a href="/about">About</a>
    <a href="/products">Products</a>
    <a href="https://twitter.com/acme">Twitter</a>
  </nav>
  <main>
    <h1>Welcome to Acme</h1>
    <a href="/blog/launch">Launch post</a>
    <a href="/about">About again</a>
    <a href="/contact?ref=home">Contact</a>
  </main>
</body></html>`;

export const PAGE_HTML_MIN = `<!doctype html><html><body><h1>page</h1></body></html>`;

export const ROBOTS_ALLOWING = `User-agent: *
Allow: /
`;

export const ROBOTS_DISALLOW_ALL = `User-agent: *
Disallow: /
`;

export const ROBOTS_DISALLOW_BLOG = `User-agent: *
Disallow: /blog/
Allow: /
`;
