import { TIER_LABELS, type Bookmark, type Tier } from "./database";

export function visibleBookmarks(bookmarks: Bookmark[], query: string, tiers: Tier[], newestFirst: boolean): Bookmark[] {
  const search = query.trim().toLocaleLowerCase();
  const allowed = new Set(tiers);
  return bookmarks
    .filter((bookmark) => allowed.has(bookmark.tier) && matchesQuery(bookmark, search))
    .sort((first, second) => (newestFirst ? second.time.localeCompare(first.time) : first.time.localeCompare(second.time)));
}

function matchesQuery(bookmark: Bookmark, search: string) {
  return !search || bookmark.title.toLocaleLowerCase().includes(search) || bookmark.url.toLocaleLowerCase().includes(search);
}

export function emptyMessage(query: string, filters: Tier[]): string {
  if (query.trim()) return "No bookmarks match your search.";
  if (filters.length === 1) return `No ${TIER_LABELS[filters[0]]} bookmarks yet.`;
  if (filters.length === 0) return "Select a tier to show bookmarks.";
  return "No bookmarks yet.";
}
