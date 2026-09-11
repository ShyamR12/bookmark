import { RANK_LABELS, RANKS, type Rank } from "./database";

export function rankFilterLabel(selected: Rank[]): string {
  if (selected.length === RANKS.length) return "All ranks";
  if (selected.length === 0) return "No ranks";
  return selected.map((rank) => RANK_LABELS[rank]).join(", ");
}
