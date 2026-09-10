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

class BookmarkDatabase extends Dexie {
  bookmarks!: EntityTable<Bookmark, "id">;

  constructor() {
    super("bookmarkit");
    this.version(1).stores({ bookmarks: "++id,&normalizedUrl,rank,time" });
  }
}

export const db = new BookmarkDatabase();
