import "./styles.css";
import { db, type Bookmark, type Rank } from "./database";
import { feedbackUrl } from "./feedback";
import { createExport, mergeAdditions, parseImport } from "./import-export";
import { normalizeUrl, pageTitle } from "./url";

const captureRow = document.querySelector<HTMLElement>("#capture-row")!;
const bookmarkButton = document.querySelector<HTMLButtonElement>("#bookmark-button")!;
const existingPanel = document.querySelector<HTMLElement>("#existing-panel")!;
const rankSelect = document.querySelector<HTMLSelectElement>("#rank-select")!;
const deleteButton = document.querySelector<HTMLButtonElement>("#delete-button")!;
const status = document.querySelector<HTMLElement>("#status")!;
const randomButton = document.querySelector<HTMLButtonElement>("#random-button")!;
const latestButton = document.querySelector<HTMLButtonElement>("#latest-button")!;
const importButton = document.querySelector<HTMLButtonElement>("#import-button")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-button")!;
const importFile = document.querySelector<HTMLInputElement>("#import-file")!;
const feedbackLink = document.querySelector<HTMLAnchorElement>("#feedback-link")!;
let activeBookmark: Bookmark | undefined;
let activeTab: chrome.tabs.Tab | undefined;

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function counted(prefix: string, count: number) {
  return `${prefix} ${count} bookmark${count === 1 ? "" : "s"}.`;
}

async function withBusy(control: HTMLButtonElement, work: () => Promise<void>, fail: string) {
  control.disabled = true;
  try {
    await work();
  } catch {
    setStatus(fail, true);
  } finally {
    control.disabled = false;
  }
}

function currentRank(): Rank {
  return document.querySelector<HTMLInputElement>('input[name="rank"]:checked')!.value as Rank;
}

function showExisting(bookmark: Bookmark | undefined) {
  activeBookmark = bookmark;
  existingPanel.hidden = !bookmark;
  captureRow.hidden = Boolean(bookmark);
  if (bookmark) rankSelect.value = bookmark.rank;
}

async function findCurrentBookmark() {
  const normalized = activeTab?.url ? normalizeUrl(activeTab.url) : null;
  if (!normalized) return;
  showExisting(await db.bookmarks.where("normalizedUrl").equals(normalized).first());
}

async function capture() {
  const tab = activeTab;
  const pageUrl = tab?.url;
  if (!tab || !pageUrl) return setStatus("This page cannot be saved.", true);
  const normalizedUrl = normalizeUrl(pageUrl);
  if (!normalizedUrl) return setStatus("Only standard web pages can be saved.", true);
  await withBusy(bookmarkButton, async () => {
    const existing = await db.bookmarks.where("normalizedUrl").equals(normalizedUrl).first();
    if (existing) {
      showExisting(existing);
      setStatus("This page is already bookmarked.");
      return;
    }
    await db.bookmarks.add({
      url: pageUrl,
      normalizedUrl,
      title: pageTitle(tab.title ?? "", pageUrl),
      rank: currentRank(),
      time: new Date().toISOString()
    });
    setStatus("Saved to your reading list.");
    window.setTimeout(() => window.close(), 550);
  }, "Couldn’t save this bookmark. Please try again.");
}

async function changeRank() {
  if (!activeBookmark?.id) return;
  const oldRank = activeBookmark.rank;
  const newRank = rankSelect.value as Rank;
  rankSelect.disabled = true;
  try {
    await db.bookmarks.update(activeBookmark.id, { rank: newRank, time: new Date().toISOString() });
    activeBookmark.rank = newRank;
    setStatus("Rank updated.");
  } catch {
    rankSelect.value = oldRank;
    setStatus("Couldn’t update the rank. Please try again.", true);
  } finally {
    rankSelect.disabled = false;
  }
}

async function deleteBookmark() {
  const id = activeBookmark?.id;
  if (!id) return;
  await withBusy(deleteButton, async () => {
    await db.bookmarks.delete(id);
    showExisting(undefined);
    setStatus("Bookmark deleted.");
  }, "Couldn’t delete this bookmark. Please try again.");
}

async function readingList() {
  const committed = await db.bookmarks.where("rank").equals("tbr").toArray();
  return committed.length > 0 ? committed : db.bookmarks.where("rank").equals("tbr-candidate").toArray();
}

async function openFromList(button: HTMLButtonElement, pick: (bookmarks: Bookmark[]) => Bookmark) {
  await withBusy(button, async () => {
    const bookmarks = await readingList();
    if (bookmarks.length === 0) return setStatus("Your reading list is empty");
    await chrome.tabs.create({ url: pick(bookmarks).url });
  }, "Couldn’t open this bookmark. Please try again.");
}

async function exportBookmarks() {
  await withBusy(exportButton, async () => {
    const exportDocument = createExport(await db.bookmarks.toArray());
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(exportDocument, null, 2)], { type: "application/json;charset=utf-8" }));
    const download = document.createElement("a");
    download.href = blobUrl;
    download.download = `bookmarkit-${exportDocument.exportedAt.slice(0, 10)}.json`;
    download.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setStatus(counted("Exported", exportDocument.bookmarks.length));
  }, "Couldn’t export your bookmarks. Please try again.");
}

async function applyImport(bookmarks: Bookmark[]): Promise<number> {
  return db.transaction("rw", db.bookmarks, async () => {
    if (bookmarks.length === 0) return 0;
    const existing = await db.bookmarks.where("normalizedUrl").anyOf(bookmarks.map((bookmark) => bookmark.normalizedUrl)).toArray();
    const additions = mergeAdditions(bookmarks, existing.map((bookmark) => bookmark.normalizedUrl));
    if (additions.length > 0) await db.bookmarks.bulkAdd(additions);
    return additions.length;
  });
}

async function importBookmarks() {
  const file = importFile.files?.[0];
  if (!file) return;
  importButton.disabled = true;
  try {
    const importedCount = await applyImport(parseImport(await file.text()));
    setStatus(counted("Added", importedCount));
    await findCurrentBookmark();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The selected file could not be imported.";
    setStatus(`Import failed: ${message}`, true);
  } finally {
    importFile.value = "";
    importButton.disabled = false;
  }
}

bookmarkButton.addEventListener("click", () => void capture());
rankSelect.addEventListener("change", () => void changeRank());
deleteButton.addEventListener("click", () => void deleteBookmark());
document.querySelector<HTMLButtonElement>("#library-button")!.addEventListener("click", () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("library.html") });
});
randomButton.addEventListener("click", () => {
  void openFromList(randomButton, (bookmarks) => bookmarks[Math.floor(Math.random() * bookmarks.length)]);
});
latestButton.addEventListener("click", () => {
  void openFromList(latestButton, (bookmarks) => bookmarks.sort((first, second) => second.time.localeCompare(first.time))[0]);
});
importButton.addEventListener("click", () => importFile.click());
exportButton.addEventListener("click", () => void exportBookmarks());
importFile.addEventListener("change", () => void importBookmarks());
feedbackLink.href = feedbackUrl(chrome.runtime.getManifest().version);
feedbackLink.addEventListener("click", (event) => {
  event.preventDefault();
  void chrome.tabs.create({ url: feedbackLink.href });
});

async function initialize() {
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await findCurrentBookmark();
  } catch {
    setStatus("Couldn’t read the current page.", true);
  }
}

void initialize();
