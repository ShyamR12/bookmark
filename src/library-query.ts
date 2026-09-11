import { RANK_LABELS, type Bookmark, type Rank } from "./database";

export function visibleBookmarks(bookmarks: Bookmark[], query: string, ranks: Rank[], newestFirst: boolean): Bookmark[] {
  const needle = query.trim().toLocaleLowerCase();
  const allowed = new Set(ranks);
  return bookmarks
    .filter((bookmark) => allowed.has(bookmark.rank) && matchesQuery(bookmark, needle))
    .sort((first, second) => (newestFirst ? second.time.localeCompare(first.time) : first.time.localeCompare(second.time)));
}

function matchesQuery(bookmark: Bookmark, needle: string) {
  return !needle || bookmark.title.toLocaleLowerCase().includes(needle) || bookmark.url.toLocaleLowerCase().includes(needle);
}

export function emptyMessage(query: string, filters: Rank[]): string {
  if (query.trim()) return "No bookmarks match your search.";
  if (filters.length === 1) return `No ${RANK_LABELS[filters[0]]} bookmarks yet.`;
  if (filters.length === 0) return "Select a rank to show bookmarks.";
  return "No bookmarks yet.";
}
