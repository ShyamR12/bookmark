import "./styles.css";
import { db, type Bookmark, type Tier } from "./database";
import { normalizeUrl, pageTitle } from "./url";

const pageTitleEl = document.querySelector<HTMLElement>("#page-title")!;
const pageHost = document.querySelector<HTMLElement>("#page-host")!;
const bookmarkButton = document.querySelector<HTMLButtonElement>("#bookmark-button")!;
const deleteButton = document.querySelector<HTMLButtonElement>("#delete-button")!;
const status = document.querySelector<HTMLElement>("#status")!;
const randomButton = document.querySelector<HTMLButtonElement>("#random-button")!;
const latestButton = document.querySelector<HTMLButtonElement>("#latest-button")!;
const tierInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="tier"]')];
const finishedTiers = [...document.querySelectorAll<HTMLElement>(".finished-tier")];
let activeBookmark: Bookmark | undefined;
let activeTab: chrome.tabs.Tab | undefined;

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function withBusy(control: HTMLButtonElement, work: () => Promise<void>, fail: string) {
  control.disabled = true;
  try {
    await work();
  } catch {
    setStatus(fail, true);
  } finally {
    control.disabled = control === bookmarkButton && (Boolean(activeBookmark) || !pageIsSavable());
  }
}

function currentTier(): Tier {
  return document.querySelector<HTMLInputElement>('input[name="tier"]:checked')!.value as Tier;
}

function setTier(tier: Tier) {
  for (const input of tierInputs) input.checked = input.value === tier;
}

function setTierDisabled(disabled: boolean) {
  for (const input of tierInputs) input.disabled = disabled;
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function pageIsSavable() {
  return Boolean(activeTab?.url && normalizeUrl(activeTab.url));
}

function showPage(tab: chrome.tabs.Tab | undefined) {
  const url = tab?.url ?? "";
  pageTitleEl.textContent = pageTitle(tab?.title ?? "", url) || "This page";
  pageHost.textContent = hostnameOf(url);
}

function showExisting(bookmark: Bookmark | undefined) {
  activeBookmark = bookmark;
  bookmarkButton.hidden = Boolean(bookmark);
  bookmarkButton.disabled = Boolean(bookmark) || !pageIsSavable();
  deleteButton.hidden = !bookmark;
  for (const label of finishedTiers) label.hidden = !bookmark;
  setTier(bookmark?.tier ?? "tbr-candidate");
}

async function findCurrentBookmark() {
  const normalized = activeTab?.url ? normalizeUrl(activeTab.url) : null;
  if (!normalized) {
    showExisting(undefined);
    return;
  }
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
    const tier = currentTier();
    const time = new Date().toISOString();
    const title = pageTitle(tab.title ?? "", pageUrl);
    const id = await db.bookmarks.add({ url: pageUrl, normalizedUrl, title, tier, time });
    showExisting({ id, url: pageUrl, normalizedUrl, title, tier, time });
    setStatus("Saved to your reading list.");
  }, "Couldn’t save this bookmark. Please try again.");
}

async function changeTier() {
  if (!activeBookmark?.id) return;
  const oldTier = activeBookmark.tier;
  const newTier = currentTier();
  if (newTier === oldTier) return;
  setTierDisabled(true);
  try {
    await db.bookmarks.update(activeBookmark.id, { tier: newTier, time: new Date().toISOString() });
    activeBookmark.tier = newTier;
    setStatus("Tier updated.");
  } catch {
    setTier(oldTier);
    setStatus("Couldn’t update the tier. Please try again.", true);
  } finally {
    setTierDisabled(false);
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
  const committed = await db.bookmarks.where("tier").equals("tbr").toArray();
  return committed.length > 0 ? committed : db.bookmarks.where("tier").equals("tbr-candidate").toArray();
}

async function openFromList(button: HTMLButtonElement, pick: (bookmarks: Bookmark[]) => Bookmark) {
  await withBusy(button, async () => {
    const bookmarks = await readingList();
    if (bookmarks.length === 0) return setStatus("Your reading list is empty");
    await chrome.tabs.create({ url: pick(bookmarks).url });
  }, "Couldn’t open this bookmark. Please try again.");
}

bookmarkButton.addEventListener("click", capture);
document.querySelector(".tier-pills")!.addEventListener("change", changeTier);
deleteButton.addEventListener("click", deleteBookmark);
document.querySelector<HTMLButtonElement>("#library-button")!.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("library.html") });
});
randomButton.addEventListener("click", () => {
  openFromList(randomButton, (bookmarks) => bookmarks[Math.floor(Math.random() * bookmarks.length)]);
});
latestButton.addEventListener("click", () => {
  openFromList(latestButton, (bookmarks) => bookmarks.sort((first, second) => second.time.localeCompare(first.time))[0]);
});

async function initialize() {
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    showPage(activeTab);
    if (!activeTab?.url) setStatus("This page cannot be saved.", true);
    else if (!normalizeUrl(activeTab.url)) setStatus("Only standard web pages can be saved.", true);
    await findCurrentBookmark();
  } catch {
    showPage(undefined);
    showExisting(undefined);
    setStatus("Couldn’t read the current page.", true);
  }
}

initialize();
