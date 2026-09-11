import { describe, expect, it } from "vitest";
import type { Bookmark } from "./database";
import { emptyMessage, visibleBookmarks } from "./library-query";

function bookmark(overrides: Partial<Bookmark>): Bookmark {
  return {
    url: "https://example.com",
    normalizedUrl: "https://example.com",
    title: "Example",
    tier: "tbr",
    time: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("visibleBookmarks", () => {
  const older = bookmark({ title: "Alpha", url: "https://alpha.example", tier: "tbr", time: "2026-01-01T00:00:00.000Z" });
  const newer = bookmark({ title: "Beta Docs", url: "https://beta.example/docs", tier: "s", time: "2026-02-01T00:00:00.000Z" });

  it("keeps rows whose tier is selected", () => {
    expect(visibleBookmarks([older, newer], "", ["tbr"], true)).toEqual([older]);
  });

  it("matches title or URL without regard to case", () => {
    expect(visibleBookmarks([older, newer], "BETA", ["tbr", "s"], true)).toEqual([newer]);
    expect(visibleBookmarks([older, newer], "alpha.EXAMPLE", ["tbr", "s"], true)).toEqual([older]);
  });

  it("sorts by stored time", () => {
    expect(visibleBookmarks([older, newer], "", ["tbr", "s"], true)).toEqual([newer, older]);
    expect(visibleBookmarks([older, newer], "", ["tbr", "s"], false)).toEqual([older, newer]);
  });
});

describe("emptyMessage", () => {
  it("explains why the table is empty", () => {
    expect(emptyMessage("query", ["tbr"])).toBe("No bookmarks match your search.");
    expect(emptyMessage("", ["tbr"])).toBe("No TBR bookmarks yet.");
    expect(emptyMessage("", [])).toBe("Select a tier to show bookmarks.");
    expect(emptyMessage("", ["tbr", "s"])).toBe("No bookmarks yet.");
  });
});
