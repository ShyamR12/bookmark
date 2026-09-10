import "./styles.css";
import { db, RANK_LABELS, RANKS, type Bookmark, type Rank } from "./database";
import { rankFilterLabel, selectedRanks } from "./rank-filter";

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
  return selectedRanks(allRanks.checked, rankCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value as Rank));
}

function updateFilterLabel() {
  rankFilterLabelEl.textContent = rankFilterLabel(allRanks.checked, checkedRanks());
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

function emptyMessage(query: string, filters: Rank[]) {
  if (query) return "No bookmarks match your search.";
  if (filters.length === 1) return `No ${RANK_LABELS[filters[0]]} bookmarks yet.`;
  if (filters.length === 0) return "Select a rank to show bookmarks.";
  return "No bookmarks yet.";
}

async function render() {
  try {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const filters = new Set(checkedRanks());
    const bookmarks = (await db.bookmarks.toArray())
      .filter((bookmark) => filters.has(bookmark.rank) && (!query || bookmark.title.toLocaleLowerCase().includes(query) || bookmark.url.toLocaleLowerCase().includes(query)))
      .sort((first, second) => newestFirst ? second.time.localeCompare(first.time) : first.time.localeCompare(second.time));
    rows.replaceChildren(...bookmarks.map(rowTemplate));
    emptyState.hidden = bookmarks.length > 0;
    emptyState.textContent = emptyMessage(query, [...filters]);
    dateSort.querySelector("span")!.textContent = newestFirst ? "↓" : "↑";
    dateSort.closest("th")?.setAttribute("aria-sort", newestFirst ? "descending" : "ascending");
  } catch {
    setStatus("Couldn’t load your bookmarks. Please reopen the library.", true);
  }
}

async function updateRank(select: HTMLSelectElement) {
  const id = Number(select.closest("tr")?.dataset.id);
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

async function deleteBookmark(button: HTMLButtonElement) {
  const id = Number(button.closest("tr")?.dataset.id);
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

searchInput.addEventListener("input", () => void render());
rankFilter.addEventListener("change", (event) => {
  const checkbox = event.target as HTMLInputElement;
  if (checkbox === allRanks) rankCheckboxes.forEach((option) => { option.checked = allRanks.checked; });
  else allRanks.checked = rankCheckboxes.every((option) => option.checked);
  updateFilterLabel();
  void render();
});
document.addEventListener("pointerdown", (event) => {
  if (rankFilter.open && !rankFilter.contains(event.target as Node)) rankFilter.open = false;
});
dateSort.addEventListener("click", () => {
  newestFirst = !newestFirst;
  void render();
});
rows.addEventListener("change", (event) => {
  const select = (event.target as HTMLElement).closest<HTMLSelectElement>("[data-action='change-rank']");
  if (select) void updateRank(select);
});
rows.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action='delete']");
  if (button) void deleteBookmark(button);
});
undoButton.addEventListener("click", () => void undoDelete());
updateFilterLabel();
void render();
