import "./styles.css";
import { db, type Bookmark, type Rank } from "./database";

type SortKey = "date" | "rank";
type SortDirection = "ascending" | "descending";

const rankLabels: Record<Rank, string> = { "tbr-candidate": "TBR?", tbr: "TBR", s: "S", a: "A", b: "B" };
const rankOrder: Rank[] = ["tbr-candidate", "tbr", "s", "a", "b"];
const rows = document.querySelector<HTMLTableSectionElement>("#bookmark-rows")!;
const searchInput = document.querySelector<HTMLInputElement>("#search-input")!;
const rankFilter = document.querySelector<HTMLDetailsElement>("#rank-filter")!;
const rankFilterLabel = document.querySelector<HTMLElement>("#rank-filter-label")!;
const allRanks = document.querySelector<HTMLInputElement>("#all-ranks")!;
const rankCheckboxes = [...rankFilter.querySelectorAll<HTMLInputElement>("input[value]")];
const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
const status = document.querySelector<HTMLElement>("#library-status")!;
const undoToast = document.querySelector<HTMLElement>("#undo-toast")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo-button")!;
let sortKey: SortKey = "date";
let sortDirection: SortDirection = "descending";
let deletedBookmark: Bookmark | undefined;
let undoTimer: number | undefined;

function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function formatDate(time: string) {
  const date = new Date(time);
  return { visible: date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }), full: date.toLocaleString() };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function sortBookmarks(bookmarks: Bookmark[]) {
  return bookmarks.sort((first, second) => {
    const comparison = sortKey === "date" ? first.time.localeCompare(second.time) : rankOrder.indexOf(first.rank) - rankOrder.indexOf(second.rank);
    return sortDirection === "ascending" ? comparison : -comparison;
  });
}

function updateSortControls() {
  document.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach((button) => {
    const key = button.dataset.sort as SortKey;
    const active = key === sortKey;
    button.classList.toggle("is-active", active);
    button.querySelector("span")!.textContent = active ? (sortDirection === "ascending" ? "↑" : "↓") : "";
    button.setAttribute("aria-label", `Sort by ${key}, ${active ? sortDirection : "not currently sorted"}`);
    button.closest("th")?.setAttribute("aria-sort", active ? sortDirection : "none");
  });
}

function emptyMessage() {
  if (searchInput.value.trim()) return "No bookmarks match your search.";
  const selected = selectedRanks();
  if (selected.length === 1) return `No ${rankLabels[selected[0]]} bookmarks yet.`;
  return "Your library is empty.";
}

function selectedRanks(): Rank[] {
  return allRanks.checked ? rankOrder : rankCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value as Rank);
}

function updateFilterLabel() {
  const selected = selectedRanks();
  rankFilterLabel.textContent = allRanks.checked ? "All ranks" : selected.length === 0 ? "No ranks" : selected.map((rank) => rankLabels[rank]).join(", ");
}

function rowTemplate(bookmark: Bookmark, position: number) {
  const date = formatDate(bookmark.time);
  const title = escapeHtml(bookmark.title);
  const url = escapeHtml(bookmark.url);
  const row = document.createElement("tr");
  row.dataset.id = String(bookmark.id);
  row.innerHTML = `
    <td class="number-cell">${position}</td>
    <td class="title-cell"><a href="${url}" target="_blank" rel="noreferrer" title="${url}">${title}</a><button class="title-edit" type="button" data-action="edit-title" aria-label="Edit title for ${title}">Edit</button></td>
    <td><select class="table-rank-select" data-action="change-rank" aria-label="Change rank for ${title}">${rankOrder.map((rank) => `<option value="${rank}"${bookmark.rank === rank ? " selected" : ""}>${rankLabels[rank]}</option>`).join("")}</select></td>
    <td><time datetime="${bookmark.time}" title="${date.full}">${date.visible}</time></td>
    <td><button class="table-delete" type="button" data-action="delete" aria-label="Delete ${title}">Delete</button></td>`;
  return row;
}

async function render() {
  try {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const filters = new Set(selectedRanks());
    let bookmarks = await db.bookmarks.toArray();
    bookmarks = bookmarks.filter((bookmark) => filters.has(bookmark.rank) && (!query || bookmark.title.toLocaleLowerCase().includes(query) || bookmark.url.toLocaleLowerCase().includes(query)));
    sortBookmarks(bookmarks);
    rows.replaceChildren(...bookmarks.map((bookmark, index) => rowTemplate(bookmark, index + 1)));
    emptyState.hidden = bookmarks.length > 0;
    emptyState.textContent = emptyMessage();
    updateSortControls();
  } catch { setStatus("Couldn’t load your bookmarks. Please reopen the library.", true); }
}

async function updateRank(select: HTMLSelectElement) {
  const id = Number(select.closest<HTMLTableRowElement>("tr")?.dataset.id);
  if (!Number.isInteger(id)) return;
  select.disabled = true;
  try {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) throw new Error("Bookmark no longer exists");
    const changed = await db.bookmarks.update(id, { rank: select.value as Rank, time: new Date().toISOString() });
    if (changed === 0) throw new Error("Bookmark was not updated");
    setStatus("Rank updated.");
    await render();
  } catch {
    await render();
    setStatus("Couldn’t update the rank. Please try again.", true);
  }
  finally { select.disabled = false; }
}

function editTitle(button: HTMLButtonElement) {
  const row = button.closest<HTMLTableRowElement>("tr");
  const link = row?.querySelector<HTMLAnchorElement>(".title-cell a");
  if (!row || !link) return;
  const input = document.createElement("input");
  input.className = "title-input";
  input.value = link.textContent ?? "";
  input.setAttribute("aria-label", "Bookmark title");
  link.replaceWith(input);
  button.textContent = "Save";
  button.dataset.action = "save-title";
  input.focus();
  input.select();
}

async function saveTitle(button: HTMLButtonElement) {
  const row = button.closest<HTMLTableRowElement>("tr");
  const input = row?.querySelector<HTMLInputElement>(".title-input");
  const id = Number(row?.dataset.id);
  const title = input?.value.trim();
  if (!input || !Number.isInteger(id) || !title) return setStatus("A bookmark title cannot be empty.", true);
  button.disabled = true;
  try {
    await db.bookmarks.update(id, { title });
    setStatus("Title updated.");
    await render();
  } catch { setStatus("Couldn’t update the title. Please try again.", true); }
  finally { button.disabled = false; }
}

function showUndo(bookmark: Bookmark) {
  deletedBookmark = bookmark;
  undoToast.hidden = false;
  if (undoTimer) window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => { deletedBookmark = undefined; undoToast.hidden = true; }, 5000);
}

async function deleteBookmark(button: HTMLButtonElement) {
  const id = Number(button.closest<HTMLTableRowElement>("tr")?.dataset.id);
  if (!Number.isInteger(id)) return;
  button.disabled = true;
  try {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) return;
    await db.bookmarks.delete(id);
    showUndo(bookmark);
    setStatus("Bookmark deleted.");
    await render();
  } catch { setStatus("Couldn’t delete this bookmark. Please try again.", true); }
  finally { button.disabled = false; }
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
  } catch { setStatus("Couldn’t restore this bookmark. Please try again.", true); }
  finally { undoButton.disabled = false; }
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
document.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach((button) => button.addEventListener("click", () => {
  const key = button.dataset.sort as SortKey;
  sortDirection = key === sortKey ? (sortDirection === "descending" ? "ascending" : "descending") : (key === "date" ? "descending" : "ascending");
  sortKey = key;
  void render();
}));
rows.addEventListener("change", (event) => {
  const select = (event.target as HTMLElement).closest<HTMLSelectElement>("[data-action='change-rank']");
  if (select) void updateRank(select);
});
rows.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit-title") editTitle(button);
  if (button.dataset.action === "save-title") void saveTitle(button);
  if (button.dataset.action === "delete") void deleteBookmark(button);
});
undoButton.addEventListener("click", () => void undoDelete());
updateFilterLabel();
void render();
