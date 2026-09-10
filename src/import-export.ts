import type { Bookmark, Rank } from "./database";
import { normalizeUrl } from "./url";

export const EXPORT_SCHEMA_VERSION = 1 as const;

export interface BookmarkitExport {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  bookmarks: Bookmark[];
}

const ranks = new Set<Rank>(["tbr-candidate", "tbr", "s", "a", "b"]);
const documentFields = new Set(["schemaVersion", "exportedAt", "bookmarks"]);
const bookmarkFields = new Set(["id", "url", "normalizedUrl", "title", "rank", "time"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function assertOnlyFields(record: Record<string, unknown>, allowed: Set<string>, subject: string) {
  const unexpected = Object.keys(record).find((key) => !allowed.has(key));
  if (unexpected) throw new Error(`${subject} contains an unexpected field: ${unexpected}.`);
}

function parseBookmark(value: unknown, position: number): Bookmark {
  const label = `Bookmark ${position}`;
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  assertOnlyFields(value, bookmarkFields, label);

  if (value.id !== undefined && (!Number.isInteger(value.id) || (value.id as number) <= 0)) {
    throw new Error(`${label} has an invalid id.`);
  }
  if (typeof value.url !== "string") throw new Error(`${label} has an invalid URL.`);
  const normalizedUrl = normalizeUrl(value.url);
  if (!normalizedUrl) throw new Error(`${label} has an invalid URL.`);
  if (typeof value.normalizedUrl !== "string") throw new Error(`${label} has an invalid normalized URL.`);
  if (typeof value.title !== "string" || value.title.trim() === "") throw new Error(`${label} has an empty title.`);
  if (typeof value.rank !== "string" || !ranks.has(value.rank as Rank)) throw new Error(`${label} has an invalid rank.`);
  if (!isValidDate(value.time)) throw new Error(`${label} has an invalid stored time.`);

  return {
    ...(value.id === undefined ? {} : { id: value.id as number }),
    url: value.url,
    normalizedUrl,
    title: value.title,
    rank: value.rank as Rank,
    time: value.time
  };
}

export function createExport(bookmarks: Bookmark[], now = new Date()): BookmarkitExport {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    bookmarks: bookmarks.map((bookmark) => ({ ...bookmark }))
  };
}

export function parseImport(contents: string): Bookmark[] {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isRecord(value)) throw new Error("The import document must be an object.");
  assertOnlyFields(value, documentFields, "The import document");
  if (value.schemaVersion !== EXPORT_SCHEMA_VERSION) throw new Error("The file uses an unsupported schema version.");
  if (!isValidDate(value.exportedAt)) throw new Error("The file has an invalid export timestamp.");
  if (!Array.isArray(value.bookmarks)) throw new Error("The file must contain a bookmarks array.");

  const bookmarks = value.bookmarks.map((bookmark, index) => parseBookmark(bookmark, index + 1));
  const normalizedUrls = new Set<string>();
  const ids = new Set<number>();
  for (const bookmark of bookmarks) {
    if (normalizedUrls.has(bookmark.normalizedUrl)) throw new Error("The file contains a duplicate URL.");
    normalizedUrls.add(bookmark.normalizedUrl);
    if (bookmark.id !== undefined) {
      if (ids.has(bookmark.id)) throw new Error("The file contains a duplicate id.");
      ids.add(bookmark.id);
    }
  }
  return bookmarks;
}
