import { RANKS, type Bookmark, type Rank } from "./database";
import { normalizeUrl } from "./url";

const ranks = new Set<Rank>(RANKS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function createExport(bookmarks: Bookmark[], now = new Date()) {
  return {
    schemaVersion: 1 as const,
    exportedAt: now.toISOString(),
    bookmarks: bookmarks.map(({ url, title, rank, time }) => ({ url, title, rank, time }))
  };
}

export function mergeAdditions(imported: Bookmark[], existingUrls: readonly string[]): Bookmark[] {
  const have = new Set(existingUrls);
  return imported.filter((bookmark) => !have.has(bookmark.normalizedUrl));
}

function parseBookmark(item: unknown, index: number, seen: Set<string>): Bookmark {
  const label = `Bookmark ${index + 1}`;
  assert(isRecord(item), `${label} must be an object.`);
  assert(typeof item.url === "string", `${label} has an invalid URL.`);
  const normalizedUrl = normalizeUrl(item.url);
  assert(normalizedUrl, `${label} has an invalid URL.`);
  assert(!seen.has(normalizedUrl), "The file contains a duplicate URL.");
  seen.add(normalizedUrl);
  assert(typeof item.title === "string" && item.title.trim() !== "", `${label} has an empty title.`);
  assert(typeof item.rank === "string" && ranks.has(item.rank as Rank), `${label} has an invalid rank.`);
  assert(typeof item.time === "string" && !Number.isNaN(Date.parse(item.time)), `${label} has an invalid stored time.`);
  return { url: item.url, normalizedUrl, title: item.title, rank: item.rank as Rank, time: item.time };
}

export function parseImport(contents: string): Bookmark[] {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  assert(isRecord(value), "The import document must be an object.");
  assert(value.schemaVersion === 1, "The file uses an unsupported schema version.");
  assert(Array.isArray(value.bookmarks), "The file must contain a bookmarks array.");
  const seen = new Set<string>();
  return value.bookmarks.map((item, index) => parseBookmark(item, index, seen));
}
