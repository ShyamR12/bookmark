import { RANKS, type Bookmark, type Rank } from "./database";
import { normalizeUrl } from "./url";

const ranks = new Set<Rank>(RANKS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createExport(bookmarks: Bookmark[], now = new Date()) {
  return {
    schemaVersion: 1 as const,
    exportedAt: now.toISOString(),
    bookmarks: bookmarks.map(({ url, title, rank, time }) => ({ url, title, rank, time }))
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
  if (value.schemaVersion !== 1) throw new Error("The file uses an unsupported schema version.");
  if (!Array.isArray(value.bookmarks)) throw new Error("The file must contain a bookmarks array.");

  const seen = new Set<string>();
  return value.bookmarks.map((item, index) => {
    const label = `Bookmark ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${label} must be an object.`);
    if (typeof item.url !== "string") throw new Error(`${label} has an invalid URL.`);
    const normalizedUrl = normalizeUrl(item.url);
    if (!normalizedUrl) throw new Error(`${label} has an invalid URL.`);
    if (seen.has(normalizedUrl)) throw new Error("The file contains a duplicate URL.");
    seen.add(normalizedUrl);
    if (typeof item.title !== "string" || item.title.trim() === "") throw new Error(`${label} has an empty title.`);
    if (typeof item.rank !== "string" || !ranks.has(item.rank as Rank)) throw new Error(`${label} has an invalid rank.`);
    if (typeof item.time !== "string" || Number.isNaN(Date.parse(item.time))) throw new Error(`${label} has an invalid stored time.`);
    return { url: item.url, normalizedUrl, title: item.title, rank: item.rank as Rank, time: item.time };
  });
}
