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
  it("uses an inline multi-select tier filter", () => {
    expect(library).toContain('id="select-all-tiers"');
    expect(library).toContain("Select all");
    expect(library).not.toContain("popovertarget");
    expect(library).toMatch(/<fieldset[^>]*id="tier-options"|id="tier-options"[^>]*class="tier-filter"/);
    expect(library).toMatch(/value="tbr"[^>]*checked|checked[^>]*value="tbr"/);
  });

  it("uses a manual popover for undo and a single live region", () => {
    expect(library).toMatch(/id="undo-toast"[^>]*popover="manual"|popover="manual"[^>]*id="undo-toast"/);
    expect(library).not.toMatch(/id="undo-toast"[^>]*aria-live/);
    expect(library.match(/aria-live="polite"/g)).toHaveLength(1);
  });

  it("declares light and dark color schemes", () => {
    expect(library).toContain('<meta name="color-scheme" content="light dark"');
  });

  it("exposes import, export, feedback, and an empty-library import CTA", () => {
    expect(library).toContain('id="import-button"');
    expect(library).toContain('id="export-button"');
    expect(library).toMatch(/id="feedback-link"[^>]*target="_blank"|target="_blank"[^>]*id="feedback-link"/);
    expect(library).toMatch(/id="import-file"[^>]*type="file"|type="file"[^>]*id="import-file"/);
    expect(library).toMatch(/accept="application\/json,\.json"/);
    expect(library).toContain('id="empty-import"');
  });
});

describe("theme and a11y CSS", () => {
  it("uses color-scheme, light-dark(), and accent-color", () => {
    expect(css).toContain("color-scheme: light dark");
    expect(css).toContain("light-dark(");
    expect(css).toContain("accent-color:");
  });

  it("keeps raised surfaces lighter than tracks in both schemes", () => {
    const surface = lightDarkPair(css, "--surface");
    const track = lightDarkPair(css, "--track");

    expect(relativeLuminance(surface.light)).toBeGreaterThan(relativeLuminance(track.light));
    expect(relativeLuminance(surface.dark)).toBeGreaterThan(relativeLuminance(track.dark));
  });

  it("does not enclose the tier filter in a surface box", () => {
    expect(css).not.toMatch(/\.tier-filter\s*\{[^}]*\bborder:/);
    expect(css).not.toMatch(/\.tier-filter\s*\{[^}]*\bborder-radius:/);
    expect(css).not.toMatch(/\.tier-filter\s*\{[^}]*\bbackground:/);
  });

  it("reveals sr-only controls when they receive focus", () => {
    expect(css).toMatch(/\.sr-only:where\(:not\(:focus-within,\s*:active\)\)/);
  });
});

function lightDarkPair(source: string, token: string) {
  const match = source.match(new RegExp(`${token}:\\s*light-dark\\((#[0-9a-fA-F]+),\\s*(#[0-9a-fA-F]+)\\)`));
  expect(match, `${token} light-dark pair`).toBeTruthy();
  return { light: match![1], dark: match![2] };
}

function relativeLuminance(hex: string) {
  const digits = hex.slice(1);
  const rgb = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = parseInt(rgb.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
