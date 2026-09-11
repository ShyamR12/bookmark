import Dexie, { type EntityTable } from "dexie";

export const TIERS = ["tbr-candidate", "tbr", "s", "a", "b"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_LABELS: Record<Tier, string> = {
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
  tier: Tier;
  time: string;
}

class BookmarkDatabase extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;

  constructor() {
    super("bookmarkit");
    this.version(4).stores({ bookmarks: "++id,&normalizedUrl,tier,time" });
  }
}

export const db = new BookmarkDatabase();
