import { describe, expect, it } from "vitest";
import { createExport, parseImport } from "./import-export";

const bookmark = {
  url: "https://example.com/a?utm_source=x",
  normalizedUrl: "https://example.com/a",
  title: "Example",
  rank: "tbr" as const,
  time: "2026-01-02T03:04:05.000Z"
};
const exportedBookmark = { url: bookmark.url, title: bookmark.title, rank: bookmark.rank, time: bookmark.time };

describe("createExport", () => {
  it("writes schema version 1 without database keys", () => {
    const exported = createExport([{ id: 7, ...bookmark }], new Date("2026-03-04T00:00:00.000Z"));
    expect(exported).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-03-04T00:00:00.000Z",
      bookmarks: [exportedBookmark]
    });
  });
});

describe("parseImport", () => {
  it("round-trips an export and recomputes the normalized URL", () => {
    const [parsed] = parseImport(JSON.stringify(createExport([bookmark])));
    expect(parsed).toEqual(bookmark);
  });

  it("ignores extra fields from older exports", () => {
    const [parsed] = parseImport(JSON.stringify({
      schemaVersion: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      extra: true,
      bookmarks: [{ ...exportedBookmark, id: 3, normalizedUrl: "https://wrong.example", note: "x" }]
    }));
    expect(parsed.id).toBeUndefined();
    expect(parsed.normalizedUrl).toBe("https://example.com/a");
  });

  it("rejects invalid files", () => {
    expect(() => parseImport("{")).toThrow("not valid JSON");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 2, bookmarks: [] }))).toThrow("unsupported schema version");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 1, bookmarks: [{ ...bookmark, url: "chrome://extensions" }] }))).toThrow("invalid URL");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 1, bookmarks: [bookmark, bookmark] }))).toThrow("duplicate URL");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 1, bookmarks: [{ ...bookmark, title: "  " }] }))).toThrow("empty title");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 1, bookmarks: [{ ...bookmark, rank: "z" }] }))).toThrow("invalid rank");
    expect(() => parseImport(JSON.stringify({ schemaVersion: 1, bookmarks: [{ ...bookmark, time: "soon" }] }))).toThrow("invalid stored time");
  });
});
