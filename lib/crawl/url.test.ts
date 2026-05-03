import { describe, expect, it } from "vitest";
import { canonicalUrlKey, dropQueryAndHash, isInternalLink, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("adds https:// when missing", () => {
    expect(normalizeUrl("vercel.com")).toBe("https://vercel.com/");
  });

  it("keeps existing http", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("strips fragment", () => {
    expect(normalizeUrl("https://example.com/path#x")).toBe("https://example.com/path");
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("rejects javascript: and other protocols", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
  });

  it("rejects localhost and private IPs", () => {
    expect(normalizeUrl("http://localhost:3000")).toBeNull();
    expect(normalizeUrl("http://127.0.0.1")).toBeNull();
    expect(normalizeUrl("http://192.168.1.10")).toBeNull();
    expect(normalizeUrl("http://example.local")).toBeNull();
  });

  it("rejects gibberish", () => {
    expect(normalizeUrl("not a url at all !!!")).toBeNull();
  });
});

describe("canonicalUrlKey", () => {
  it("lowercases hostname", () => {
    expect(canonicalUrlKey("https://EXAMPLE.com/Path")).toBe("https://example.com/Path");
  });

  it("strips trailing slash on non-root paths", () => {
    expect(canonicalUrlKey("https://example.com/foo/")).toBe("https://example.com/foo");
  });

  it("preserves root slash", () => {
    expect(canonicalUrlKey("https://example.com/")).toBe("https://example.com/");
  });
});

describe("isInternalLink", () => {
  it("treats same-host as internal", () => {
    expect(isInternalLink("https://example.com/about", "https://example.com")).toBe(true);
  });
  it("treats relative as internal", () => {
    expect(isInternalLink("/about", "https://example.com")).toBe(true);
  });
  it("treats subdomain as external", () => {
    expect(isInternalLink("https://blog.example.com/x", "https://example.com")).toBe(false);
  });
  it("treats different domain as external", () => {
    expect(isInternalLink("https://other.com", "https://example.com")).toBe(false);
  });
});

describe("dropQueryAndHash", () => {
  it("strips both", () => {
    expect(dropQueryAndHash("https://x.com/p?a=1#f")).toBe("https://x.com/p");
  });
});
