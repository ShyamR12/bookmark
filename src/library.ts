import "./styles.css";
import { db, TIER_LABELS, TIERS, type Bookmark, type Tier } from "./database";
import { feedbackUrl } from "./feedback";
import { createExport, mergeAdditions, parseImport } from "./import-export";
import { emptyMessage, visibleBookmarks } from "./library-query";
import { hideManualPopover, showManualPopover } from "./popover";
import { toggleAllTiers } from "./tier-filter";

const rows = document.querySelector<HTMLTableSectionElement>("#bookmark-rows")!;
const searchInput = document.querySelector<HTMLInputElement>("#search-input")!;
const tierFilter = document.querySelector<HTMLElement>("#tier-options")!;
const selectAllTiers = document.querySelector<HTMLButtonElement>("#select-all-tiers")!;
const tierCheckboxes = [...tierFilter.querySelectorAll<HTMLInputElement>("input[value]")];
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const emptyImport = document.querySelector<HTMLButtonElement>("#empty-import")!;
const status = document.querySelector<HTMLElement>("#library-status")!;
const dateSort = document.querySelector<HTMLButtonElement>("#date-sort")!;
const undoToast = document.querySelector<HTMLElement>("#undo-toast")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo-button")!;
const importButton = document.querySelector<HTMLButtonElement>("#import-button")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-button")!;
const importFile = document.querySelector<HTMLInputElement>("#import-file")!;
const feedbackLink = document.querySelector<HTMLAnchorElement>("#feedback-link")!;
let newestFirst = true;
let deletedBookmark: Bookmark | undefined;
let undoTimer: number | undefined;

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

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function checkedTiers(): Tier[] {
  return tierCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value as Tier);
}

function rowId(from: HTMLElement) {
  return Number(from.closest("tr")?.dataset.id);
}

function rowTemplate(bookmark: Bookmark) {
  const date = new Date(bookmark.time);
  const title = escapeHtml(bookmark.title);
  const url = escapeHtml(bookmark.url);
  const row = document.createElement("tr");
  row.dataset.id = String(bookmark.id);
  row.innerHTML = `
    <td class="title-cell"><a href="${url}" target="_blank" rel="noreferrer" title="${url}">${title}<svg class="external-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg></a></td>
    <td><select class="table-tier-select" data-action="change-tier" aria-label="Change tier for ${title}">${TIERS.map((tier) => `<option value="${tier}"${bookmark.tier === tier ? " selected" : ""}>${TIER_LABELS[tier]}</option>`).join("")}</select></td>
    <td class="date-cell"><time datetime="${bookmark.time}" title="${date.toLocaleString()}">${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></td>
    <td><button class="table-delete" type="button" data-action="delete" aria-label="Delete ${title}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg></button></td>`;
  return row;
}

async function render() {
  try {
    const query = searchInput.value;
    const filters = checkedTiers();
    const stored = await db.bookmarks.toArray();
    const bookmarks = visibleBookmarks(stored, query, filters, newestFirst);
    rows.replaceChildren(...bookmarks.map(rowTemplate));
    emptyState.hidden = bookmarks.length > 0;
    emptyState.textContent = emptyMessage(query, filters);
    emptyImport.hidden = stored.length !== 0;
    dateSort.querySelector("span")!.textContent = newestFirst ? "↓" : "↑";
    dateSort.closest("th")?.setAttribute("aria-sort", newestFirst ? "descending" : "ascending");
    return true;
  } catch {
    setStatus("Couldn’t load your bookmarks. Please reopen the library.", true);
    return false;
  }
}

async function updateTier(select: HTMLSelectElement | null) {
  if (!select) return;
  const id = rowId(select);
  if (!Number.isInteger(id)) return;
  select.disabled = true;
  try {
    const changed = await db.bookmarks.update(id, { tier: select.value as Tier, time: new Date().toISOString() });
    if (changed === 0) throw new Error("missing");
    setStatus("Tier updated.");
    await render();
  } catch {
    await render();
    setStatus("Couldn’t update the tier. Please try again.", true);
  } finally {
    select.disabled = false;
  }
}

function showUndo(bookmark: Bookmark) {
  deletedBookmark = bookmark;
  showManualPopover(undoToast);
  if (undoTimer) window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => {
    deletedBookmark = undefined;
    hideManualPopover(undoToast);
  }, 5000);
}

async function deleteBookmark(button: HTMLButtonElement | null) {
  if (!button) return;
  const id = rowId(button);
  if (!Number.isInteger(id)) return;
  button.disabled = true;
  try {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) return;
    await db.bookmarks.delete(id);
    showUndo(bookmark);
    setStatus("Bookmark deleted.");
    await render();
  } catch {
    setStatus("Couldn’t delete this bookmark. Please try again.", true);
  } finally {
    button.disabled = false;
  }
}

async function undoDelete() {
  if (!deletedBookmark) return;
  undoButton.disabled = true;
  try {
    await db.bookmarks.put(deletedBookmark);
    setStatus("Bookmark restored.");
    deletedBookmark = undefined;
    hideManualPopover(undoToast);
    if (undoTimer) window.clearTimeout(undoTimer);
    await render();
  } catch {
    setStatus("Couldn’t restore this bookmark. Please try again.", true);
  } finally {
    undoButton.disabled = false;
  }
}

function actionElement<T extends HTMLElement>(event: Event, action: string) {
  return (event.target as HTMLElement).closest<T>(`[data-action="${action}"]`);
}

function onTierFilterChange() {
  render();
}

function onSelectAllTiers() {
  toggleAllTiers(tierCheckboxes);
  render();
}

function toggleDateSort() {
  newestFirst = !newestFirst;
  render();
}

function pickImportFile() {
  importFile.click();
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

async function applyImport(bookmarks: Bookmark[]) {
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
  emptyImport.disabled = true;
  try {
    const importedCount = await applyImport(parseImport(await file.text()));
    setStatus(counted("Added", importedCount));
    await render();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The selected file could not be imported.";
    setStatus(`Import failed: ${message}`, true);
  } finally {
    importFile.value = "";
    importButton.disabled = false;
    emptyImport.disabled = false;
  }
}

searchInput.addEventListener("input", render);
selectAllTiers.addEventListener("click", onSelectAllTiers);
tierFilter.addEventListener("change", onTierFilterChange);
dateSort.addEventListener("click", toggleDateSort);
rows.addEventListener("change", (event) => updateTier(actionElement(event, "change-tier")));
rows.addEventListener("click", (event) => deleteBookmark(actionElement(event, "delete")));
undoButton.addEventListener("click", undoDelete);
importButton.addEventListener("click", pickImportFile);
emptyImport.addEventListener("click", pickImportFile);
exportButton.addEventListener("click", exportBookmarks);
importFile.addEventListener("change", importBookmarks);

async function showIdleCount() {
  const count = await db.bookmarks.count();
  setStatus(`${count} bookmark${count === 1 ? "" : "s"}.`);
}

async function initialize() {
  feedbackLink.href = feedbackUrl(chrome.runtime.getManifest().version);
  if (await render()) await showIdleCount();
}

initialize();
