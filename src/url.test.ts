import { describe, expect, it } from "vitest";
import { normalizeUrl, pageTitle } from "./url";

describe("normalizeUrl", () => {
  it("lowercases the host, drops the fragment, and default ports", () => {
    expect(normalizeUrl("HTTPS://News.Example.COM:443/a#section")).toBe("https://news.example.com/a");
    expect(normalizeUrl("HTTP://Example.COM:80/a")).toBe("http://example.com/a");
  });

  it("strips tracking parameters and sorts the rest", () => {
    expect(normalizeUrl("https://example.com/a?b=2&utm_source=x&a=1&fbclid=1&gclid=2")).toBe("https://example.com/a?a=1&b=2");
  });

  it("keeps query parameters that identify content", () => {
    expect(normalizeUrl("https://example.com/watch?v=abc")).toBe("https://example.com/watch?v=abc");
  });

  it("rejects non-http URLs", () => {
    expect(normalizeUrl("chrome://extensions")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("pageTitle", () => {
  it("uses a cleaned title when one exists", () => {
    expect(pageTitle("  Two   words  ", "https://example.com")).toBe("Two words");
  });

  it("falls back to the hostname", () => {
    expect(pageTitle("   ", "https://news.example.com/a")).toBe("news.example.com");
  });
});
