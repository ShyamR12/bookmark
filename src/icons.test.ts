import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function pngSize(path: string) {
  const buffer = readFileSync(path);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("extension icons", () => {
  it.each([16, 48, 128] as const)("ships a %i×%i PNG", (size) => {
    expect(pngSize(`public/icons/icon-${size}.png`)).toEqual({ width: size, height: size });
  });

  it("references each size from the manifest", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8")) as {
      icons: Record<string, string>;
      action: { default_icon: Record<string, string> };
    };
    for (const size of ["16", "48", "128"]) {
      expect(manifest.icons[size]).toBe(`icons/icon-${size}.png`);
      expect(manifest.action.default_icon[size]).toBe(`icons/icon-${size}.png`);
    }
  });
});
