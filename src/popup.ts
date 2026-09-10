import "./styles.css";
import { db, type Bookmark, type Rank } from "./database";
import { normalizeUrl, pageTitle } from "./url";

const bookmarkButton = document.querySelector<HTMLButtonElement>("#bookmark-button")!;
const existingPanel = document.querySelector<HTMLElement>("#existing-panel")!;
const rankSelect = document.querySelector<HTMLSelectElement>("#rank-select")!;
const deleteButton = document.querySelector<HTMLButtonElement>("#delete-button")!;
const status = document.querySelector<HTMLElement>("#status")!;
let activeBookmark: Bookmark | undefined;
let activeTab: chrome.tabs.Tab | undefined;

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function currentRank(): Rank {
  return document.querySelector<HTMLInputElement>('input[name="rank"]:checked')!.value as Rank;
}

async function findCurrentBookmark() {
  const normalized = activeTab?.url ? normalizeUrl(activeTab.url) : null;
  if (!normalized) return;
  activeBookmark = await db.bookmarks.where("normalizedUrl").equals(normalized).first();
  if (activeBookmark) {
    existingPanel.hidden = false;
    bookmarkButton.hidden = true;
    rankSelect.value = activeBookmark.rank;
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
      activeBookmark = existing;
      existingPanel.hidden = false;
      bookmarkButton.hidden = true;
      rankSelect.value = existing.rank;
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
    setStatus("Bookmark deleted.");
  } catch { setStatus("Couldn’t delete this bookmark. Please try again.", true); }
  finally { deleteButton.disabled = false; }
}

function comingSoon() { setStatus("This action is coming in the next section."); }

bookmarkButton.addEventListener("click", capture);
rankSelect.addEventListener("change", changeRank);
deleteButton.addEventListener("click", deleteBookmark);
document.querySelector<HTMLButtonElement>("#library-button")!.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("library.html") }));
document.querySelector<HTMLButtonElement>("#random-button")!.addEventListener("click", comingSoon);
document.querySelector<HTMLButtonElement>("#latest-button")!.addEventListener("click", comingSoon);
document.querySelector<HTMLButtonElement>("#import-button")!.addEventListener("click", comingSoon);
document.querySelector<HTMLButtonElement>("#export-button")!.addEventListener("click", comingSoon);
document.querySelector<HTMLButtonElement>("#feedback-button")!.addEventListener("click", () => setStatus("Feedback link will be added before release."));

async function initialize() {
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await findCurrentBookmark();
  } catch { setStatus("Couldn’t read the current page.", true); }
}

void initialize();
