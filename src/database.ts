import Dexie, { type EntityTable } from "dexie";

export const RANKS = ["tbr-candidate", "tbr", "s", "a", "b"] as const;
export type Rank = (typeof RANKS)[number];
export const RANK_LABELS: Record<Rank, string> = {
  "tbr-candidate": "TBR?",
  tbr: "TBR",
  s: "S",
  a: "A",
  b: "B"
};

export interface Bookmark {
  id?: number;
  url: string;
  normalizedUrl: string;
  title: string;
  rank: Rank;
  time: string;
}

class BookmarkDatabase extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;

  constructor() {
    super("bookmarkit");
    this.version(3).stores({ bookmarks: "++id,&normalizedUrl,rank,time" });
  }
}

export const db = new BookmarkDatabase();
