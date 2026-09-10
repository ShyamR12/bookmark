import { RANK_LABELS, RANKS, type Rank } from "./database";

export function selectedRanks(allChecked: boolean, checked: Rank[]): Rank[] {
  return allChecked ? [...RANKS] : checked;
}

export function rankFilterLabel(allChecked: boolean, selected: Rank[]): string {
  if (allChecked) return "All ranks";
  if (selected.length === 0) return "No ranks";
  return selected.map((rank) => RANK_LABELS[rank]).join(", ");
}
