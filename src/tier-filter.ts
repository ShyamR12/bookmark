import { TIER_LABELS, TIERS, type Tier } from "./database";

export function tierFilterLabel(selected: Tier[]): string {
  if (selected.length === TIERS.length) return "All tiers";
  if (selected.length === 0) return "No tiers";
  return selected.map((tier) => TIER_LABELS[tier]).join(", ");
}

export function syncTierSelection(
  changed: { checked: boolean },
  all: { checked: boolean },
  tiers: { checked: boolean }[]
) {
  if (changed === all) {
    for (const tier of tiers) tier.checked = all.checked;
    return;
  }
  all.checked = tiers.every((tier) => tier.checked);
}
