import { describe, expect, it } from "vitest";
import { createExport, parseImport } from "./import-export";

const bookmark = {
  id: 7,
  url: "https://Example.com/article?utm_source=test&b=2&a=1#section",
  normalizedUrl: "https://example.com/article?a=1&b=2",
  title: "An article",
  rank: "tbr" as const,
  time: "2026-09-10T12:00:00.000Z"
};

describe("createExport", () => {
  it("creates the versioned document without changing bookmarks", () => {
    const document = createExport([bookmark], new Date("2026-09-10T13:00:00.000Z"));

    expect(document).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-09-10T13:00:00.000Z",
      bookmarks: [bookmark]
    });
    expect(document.bookmarks[0]).not.toBe(bookmark);
  });
});

describe("parseImport", () => {
  it("validates records and recalculates normalized URLs", () => {
    const imported = parseImport(JSON.stringify({
      schemaVersion: 1,
      exportedAt: "2026-09-10T13:00:00.000Z",
      bookmarks: [{ ...bookmark, normalizedUrl: "stale value" }]
    }));

    expect(imported).toEqual([{ ...bookmark, normalizedUrl: "https://example.com/article?a=1&b=2" }]);
  });

  it.each([
    ["malformed JSON", "{", "not valid JSON"],
    ["unsupported schema", JSON.stringify({ schemaVersion: 2, exportedAt: bookmark.time, bookmarks: [] }), "schema version"],
    ["invalid export timestamp", JSON.stringify({ schemaVersion: 1, exportedAt: "yesterday", bookmarks: [] }), "export timestamp"],
    ["invalid URL", JSON.stringify({ schemaVersion: 1, exportedAt: bookmark.time, bookmarks: [{ ...bookmark, url: "javascript:alert(1)" }] }), "invalid URL"],
    ["invalid rank", JSON.stringify({ schemaVersion: 1, exportedAt: bookmark.time, bookmarks: [{ ...bookmark, rank: "later" }] }), "invalid rank"],
    ["invalid stored time", JSON.stringify({ schemaVersion: 1, exportedAt: bookmark.time, bookmarks: [{ ...bookmark, time: "today" }] }), "invalid stored time"],
    ["empty title", JSON.stringify({ schemaVersion: 1, exportedAt: bookmark.time, bookmarks: [{ ...bookmark, title: "  " }] }), "empty title"],
    ["invalid id", JSON.stringify({ schemaVersion: 1, exportedAt: bookmark.time, bookmarks: [{ ...bookmark, id: -1 }] }), "invalid id"]
  ])("rejects %s", (_name, contents, message) => {
    expect(() => parseImport(contents)).toThrow(message);
  });

  it("rejects duplicate normalized URLs in the file", () => {
    const contents = JSON.stringify({
      schemaVersion: 1,
      exportedAt: bookmark.time,
      bookmarks: [
        bookmark,
        { ...bookmark, id: 8, url: "https://example.com/article?b=2&a=1#different" }
      ]
    });

    expect(() => parseImport(contents)).toThrow("duplicate URL");
  });

  it("rejects duplicate bookmark ids", () => {
    const contents = JSON.stringify({
      schemaVersion: 1,
      exportedAt: bookmark.time,
      bookmarks: [
        bookmark,
        { ...bookmark, url: "https://example.com/other", normalizedUrl: "https://example.com/other" }
      ]
    });

    expect(() => parseImport(contents)).toThrow("duplicate id");
  });

  it("rejects unexpected document and record fields", () => {
    expect(() => parseImport(JSON.stringify({
      schemaVersion: 1,
      exportedAt: bookmark.time,
      bookmarks: [{ ...bookmark, unexpected: true }]
    }))).toThrow("unexpected field");
  });
});
