import { RANK_LABELS, RANKS, type Rank } from "./database";

export function rankFilterLabel(selected: Rank[]): string {
  if (selected.length === RANKS.length) return "All ranks";
  if (selected.length === 0) return "No ranks";
  return selected.map((rank) => RANK_LABELS[rank]).join(", ");
}

export function syncRankSelection(
  changed: { checked: boolean },
  all: { checked: boolean },
  ranks: { checked: boolean }[]
) {
  if (changed === all) {
    for (const rank of ranks) rank.checked = all.checked;
    return;
  }
  all.checked = ranks.every((rank) => rank.checked);
}
