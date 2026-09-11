export function toggleAllTiers(tiers: { checked: boolean }[]) {
  const next = !tiers.every((tier) => tier.checked);
  for (const tier of tiers) tier.checked = next;
}
