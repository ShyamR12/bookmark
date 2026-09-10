import Dexie, { type EntityTable } from "dexie";

export type Rank = "tbr-candidate" | "tbr" | "s" | "a" | "b";

export interface Bookmark {
  id?: number;
  url: string;
  normalizedUrl: string;
  title: string;
  rank: Rank;
  time: string;
}

interface Setting {
  key: string;
  value: number;
}

class BookmarkDatabase extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("bookmarkit");
    this.version(1).stores({ bookmarks: "++id,&normalizedUrl,rank,time" });
    this.version(2).stores({ bookmarks: "++id,&normalizedUrl,rank,time", settings: "&key" });
  }
}

export const db = new BookmarkDatabase();
