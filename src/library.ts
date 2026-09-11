import "./styles.css";
import { db, RANK_LABELS, RANKS, type Bookmark, type Rank } from "./database";
import { emptyMessage, visibleBookmarks } from "./library-query";
import { rankFilterLabel, syncRankSelection } from "./rank-filter";

const rows = document.querySelector<HTMLTableSectionElement>("#bookmark-rows")!;
const searchInput = document.querySelector<HTMLInputElement>("#search-input")!;
const rankFilter = document.querySelector<HTMLDetailsElement>("#rank-filter")!;
const rankFilterLabelEl = document.querySelector<HTMLElement>("#rank-filter-label")!;
const allRanks = document.querySelector<HTMLInputElement>("#all-ranks")!;
const rankCheckboxes = [...rankFilter.querySelectorAll<HTMLInputElement>("input[value]")];
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const status = document.querySelector<HTMLElement>("#library-status")!;
const dateSort = document.querySelector<HTMLButtonElement>("#date-sort")!;
const undoToast = document.querySelector<HTMLElement>("#undo-toast")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo-button")!;
let newestFirst = true;
let deletedBookmark: Bookmark | undefined;
let undoTimer: number | undefined;

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function checkedRanks(): Rank[] {
  return rankCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value as Rank);
}

function updateFilterLabel() {
  rankFilterLabelEl.textContent = rankFilterLabel(checkedRanks());
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
    <td class="title-cell"><a href="${url}" target="_blank" rel="noreferrer" title="${url}">${title}</a></td>
    <td><select class="table-rank-select" data-action="change-rank" aria-label="Change rank for ${title}">${RANKS.map((rank) => `<option value="${rank}"${bookmark.rank === rank ? " selected" : ""}>${RANK_LABELS[rank]}</option>`).join("")}</select></td>
    <td><time datetime="${bookmark.time}" title="${date.toLocaleString()}">${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></td>
    <td><button class="table-delete" type="button" data-action="delete" aria-label="Delete ${title}">Delete</button></td>`;
  return row;
}

async function render() {
  try {
    const query = searchInput.value;
    const filters = checkedRanks();
    const bookmarks = visibleBookmarks(await db.bookmarks.toArray(), query, filters, newestFirst);
    rows.replaceChildren(...bookmarks.map(rowTemplate));
    emptyState.hidden = bookmarks.length > 0;
    emptyState.textContent = emptyMessage(query, filters);
    dateSort.querySelector("span")!.textContent = newestFirst ? "↓" : "↑";
    dateSort.closest("th")?.setAttribute("aria-sort", newestFirst ? "descending" : "ascending");
  } catch {
    setStatus("Couldn’t load your bookmarks. Please reopen the library.", true);
  }
}

async function updateRank(select: HTMLSelectElement | null) {
  if (!select) return;
  const id = rowId(select);
  if (!Number.isInteger(id)) return;
  select.disabled = true;
  try {
    const changed = await db.bookmarks.update(id, { rank: select.value as Rank, time: new Date().toISOString() });
    if (changed === 0) throw new Error("missing");
    setStatus("Rank updated.");
    await render();
  } catch {
    await render();
    setStatus("Couldn’t update the rank. Please try again.", true);
  } finally {
    select.disabled = false;
  }
}

function showUndo(bookmark: Bookmark) {
  deletedBookmark = bookmark;
  undoToast.hidden = false;
  if (undoTimer) window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => {
    deletedBookmark = undefined;
    undoToast.hidden = true;
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
    undoToast.hidden = true;
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

function onRankFilterChange(event: Event) {
  syncRankSelection(event.target as HTMLInputElement, allRanks, rankCheckboxes);
  updateFilterLabel();
  render();
}

function closeRankFilter(event: PointerEvent) {
  if (rankFilter.open && !rankFilter.contains(event.target as Node)) rankFilter.open = false;
}

function toggleDateSort() {
  newestFirst = !newestFirst;
  render();
}

searchInput.addEventListener("input", render);
rankFilter.addEventListener("change", onRankFilterChange);
document.addEventListener("pointerdown", closeRankFilter);
dateSort.addEventListener("click", toggleDateSort);
rows.addEventListener("change", (event) => updateRank(actionElement(event, "change-rank")));
rows.addEventListener("click", (event) => deleteBookmark(actionElement(event, "delete")));
undoButton.addEventListener("click", undoDelete);
updateFilterLabel();
render();
