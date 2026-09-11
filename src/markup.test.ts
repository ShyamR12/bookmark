import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const popup = readFileSync("popup.html", "utf8");
const library = readFileSync("library.html", "utf8");
const css = readFileSync("src/styles.css", "utf8");

describe("popup markup", () => {
  it("has a page heading", () => {
    expect(popup).toMatch(/<h1\b/);
  });

  it("declares light and dark color schemes", () => {
    expect(popup).toContain('<meta name="color-scheme" content="light dark"');
  });
});

describe("library markup", () => {
  it("uses a native auto popover for the rank filter", () => {
    expect(library).toContain('popovertarget="rank-options"');
    expect(library).toMatch(/id="rank-options"[^>]*popover="auto"|popover="auto"[^>]*id="rank-options"/);
  });

  it("uses a manual popover for undo and a single live region", () => {
    expect(library).toMatch(/id="undo-toast"[^>]*popover="manual"|popover="manual"[^>]*id="undo-toast"/);
    expect(library).not.toMatch(/id="undo-toast"[^>]*aria-live/);
    expect(library.match(/aria-live="polite"/g)).toHaveLength(1);
  });

  it("declares light and dark color schemes", () => {
    expect(library).toContain('<meta name="color-scheme" content="light dark"');
  });
});

describe("theme and a11y CSS", () => {
  it("uses color-scheme, light-dark(), and accent-color", () => {
    expect(css).toContain("color-scheme: light dark");
    expect(css).toContain("light-dark(");
    expect(css).toContain("accent-color:");
  });

  it("reveals sr-only controls when they receive focus", () => {
    expect(css).toMatch(/\.sr-only:where\(:not\(:focus-within,\s*:active\)\)/);
  });
});
