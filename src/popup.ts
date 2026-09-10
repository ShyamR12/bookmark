import "./styles.css";
import { db, type Bookmark, type Rank } from "./database";
import { createExport, parseImport } from "./import-export";
import { normalizeUrl, pageTitle } from "./url";

const bookmarkButton = document.querySelector<HTMLButtonElement>("#bookmark-button")!;
const existingPanel = document.querySelector<HTMLElement>("#existing-panel")!;
const rankSelect = document.querySelector<HTMLSelectElement>("#rank-select")!;
const deleteButton = document.querySelector<HTMLButtonElement>("#delete-button")!;
const status = document.querySelector<HTMLElement>("#status")!;
const randomButton = document.querySelector<HTMLButtonElement>("#random-button")!;
const latestButton = document.querySelector<HTMLButtonElement>("#latest-button")!;
const importButton = document.querySelector<HTMLButtonElement>("#import-button")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-button")!;
const importDialog = document.querySelector<HTMLDialogElement>("#import-dialog")!;
const importFile = document.querySelector<HTMLInputElement>("#import-file")!;
const chooseImportFile = document.querySelector<HTMLButtonElement>("#choose-import-file")!;
let activeBookmark: Bookmark | undefined;
let activeTab: chrome.tabs.Tab | undefined;
let pendingImportMode: "merge" | "replace" = "merge";

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function currentRank(): Rank {
  return document.querySelector<HTMLInputElement>('input[name="rank"]:checked')!.value as Rank;
}

function showExistingBookmark(bookmark: Bookmark) {
  activeBookmark = bookmark;
  existingPanel.hidden = false;
  bookmarkButton.hidden = true;
  rankSelect.value = bookmark.rank;
  document.querySelector<HTMLElement>(".popup-shell")!.classList.add("is-existing");
}

async function findCurrentBookmark() {
  const normalized = activeTab?.url ? normalizeUrl(activeTab.url) : null;
  if (!normalized) return;
  activeBookmark = await db.bookmarks.where("normalizedUrl").equals(normalized).first();
  if (activeBookmark) {
    showExistingBookmark(activeBookmark);
  } else {
    existingPanel.hidden = true;
    bookmarkButton.hidden = false;
    document.querySelector<HTMLElement>(".popup-shell")!.classList.remove("is-existing");
  }
}

async function capture() {
  if (!activeTab?.url) return setStatus("This page cannot be saved.", true);
  const normalizedUrl = normalizeUrl(activeTab.url);
  if (!normalizedUrl) return setStatus("Only standard web pages can be saved.", true);
  bookmarkButton.disabled = true;
  try {
    const existing = await db.bookmarks.where("normalizedUrl").equals(normalizedUrl).first();
    if (existing) {
      showExistingBookmark(existing);
      setStatus("This page is already bookmarked.");
      return;
    }
    await db.bookmarks.add({ url: activeTab.url, normalizedUrl, title: pageTitle(activeTab.title ?? "", activeTab.url), rank: currentRank(), time: new Date().toISOString() });
    setStatus("Saved to your reading list.");
    window.setTimeout(() => window.close(), 550);
  } catch {
    setStatus("Couldn’t save this bookmark. Please try again.", true);
  } finally {
    bookmarkButton.disabled = false;
  }
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
  } finally { rankSelect.disabled = false; }
}

async function deleteBookmark() {
  if (!activeBookmark?.id) return;
  deleteButton.disabled = true;
  try {
    await db.bookmarks.delete(activeBookmark.id);
    activeBookmark = undefined;
    existingPanel.hidden = true;
    bookmarkButton.hidden = false;
    document.querySelector<HTMLElement>(".popup-shell")!.classList.remove("is-existing");
    setStatus("Bookmark deleted.");
  } catch { setStatus("Couldn’t delete this bookmark. Please try again.", true); }
  finally { deleteButton.disabled = false; }
}

async function openBookmark(bookmark: Bookmark, button: HTMLButtonElement) {
  button.disabled = true;
  try {
    await chrome.tabs.create({ url: bookmark.url });
  } catch {
    setStatus("Couldn’t open this bookmark. Please try again.", true);
  } finally {
    button.disabled = false;
  }
}

async function openRandomBookmark() {
  randomButton.disabled = true;
  try {
    let eligible = await db.bookmarks.where("rank").equals("tbr").toArray();
    if (eligible.length === 0) eligible = await db.bookmarks.where("rank").equals("tbr-candidate").toArray();
    if (eligible.length === 0) return setStatus("Your reading list is empty");

    const previous = await db.settings.get("last-random-bookmark");
    const alternatives = eligible.filter((bookmark) => bookmark.id !== previous?.value);
    const choices = alternatives.length > 0 ? alternatives : eligible;
    const selected = choices[Math.floor(Math.random() * choices.length)];
    await db.settings.put({ key: "last-random-bookmark", value: selected.id! });
    await openBookmark(selected, randomButton);
  } catch {
    setStatus("Couldn’t choose a bookmark. Please try again.", true);
  } finally {
    randomButton.disabled = false;
  }
}

async function openLatestBookmark() {
  latestButton.disabled = true;
  try {
    let latest = await db.bookmarks.where("rank").equals("tbr").toArray();
    if (latest.length === 0) latest = await db.bookmarks.where("rank").equals("tbr-candidate").toArray();
    if (latest.length === 0) return setStatus("Your reading list is empty");
    latest.sort((first, second) => second.time.localeCompare(first.time));
    await openBookmark(latest[0], latestButton);
  } catch {
    setStatus("Couldn’t find the latest bookmark. Please try again.", true);
  } finally {
    latestButton.disabled = false;
  }
}

function bookmarkWithoutId(bookmark: Bookmark): Omit<Bookmark, "id"> {
  return {
    url: bookmark.url,
    normalizedUrl: bookmark.normalizedUrl,
    title: bookmark.title,
    rank: bookmark.rank,
    time: bookmark.time
  };
}

async function exportBookmarks() {
  exportButton.disabled = true;
  try {
    const exportDocument = createExport(await db.bookmarks.toArray());
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(exportDocument, null, 2)], { type: "application/json;charset=utf-8" }));
    const download = document.createElement("a");
    download.href = blobUrl;
    download.download = `bookmarkit-${exportDocument.exportedAt.slice(0, 10)}.json`;
    download.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setStatus(`Exported ${exportDocument.bookmarks.length} bookmark${exportDocument.bookmarks.length === 1 ? "" : "s"}.`);
  } catch {
    setStatus("Couldn’t export your bookmarks. Please try again.", true);
  } finally {
    exportButton.disabled = false;
  }
}

async function applyImport(bookmarks: Bookmark[], mode: "merge" | "replace"): Promise<number> {
  return db.transaction("rw", db.bookmarks, async () => {
    if (mode === "replace") {
      await db.bookmarks.clear();
      if (bookmarks.length > 0) await db.bookmarks.bulkAdd(bookmarks);
      return bookmarks.length;
    }

    if (bookmarks.length === 0) return 0;
    const existing = await db.bookmarks.where("normalizedUrl").anyOf(bookmarks.map((bookmark) => bookmark.normalizedUrl)).toArray();
    const existingUrls = new Set(existing.map((bookmark) => bookmark.normalizedUrl));
    const additions = bookmarks.filter((bookmark) => !existingUrls.has(bookmark.normalizedUrl)).map(bookmarkWithoutId);
    if (additions.length > 0) await db.bookmarks.bulkAdd(additions);
    return additions.length;
  });
}

function showImportDialog() {
  if (!importDialog.open) importDialog.showModal();
}

function chooseFile() {
  pendingImportMode = document.querySelector<HTMLInputElement>('input[name="import-mode"]:checked')!.value as "merge" | "replace";
  importFile.click();
}

async function importBookmarks() {
  const file = importFile.files?.[0];
  if (!file) return;
  importButton.disabled = true;
  chooseImportFile.disabled = true;
  importDialog.close();
  try {
    const bookmarks = parseImport(await file.text());
    const importedCount = await applyImport(bookmarks, pendingImportMode);
    const action = pendingImportMode === "replace" ? "Imported" : "Added";
    setStatus(`${action} ${importedCount} bookmark${importedCount === 1 ? "" : "s"}.`);
    await findCurrentBookmark();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The selected file could not be imported.";
    setStatus(`Import failed: ${message}`, true);
  } finally {
    importFile.value = "";
    importButton.disabled = false;
    chooseImportFile.disabled = false;
  }
}

bookmarkButton.addEventListener("click", capture);
rankSelect.addEventListener("change", changeRank);
deleteButton.addEventListener("click", deleteBookmark);
document.querySelector<HTMLButtonElement>("#library-button")!.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("library.html") }));
randomButton.addEventListener("click", openRandomBookmark);
latestButton.addEventListener("click", openLatestBookmark);
importButton.addEventListener("click", showImportDialog);
exportButton.addEventListener("click", () => void exportBookmarks());
chooseImportFile.addEventListener("click", chooseFile);
importFile.addEventListener("change", () => void importBookmarks());

async function initialize() {
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await findCurrentBookmark();
  } catch { setStatus("Couldn’t read the current page.", true); }
}

void initialize();
