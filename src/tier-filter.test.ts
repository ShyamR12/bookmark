import { describe, expect, it } from "vitest";
import { TIER_LABELS, TIERS, type Tier } from "./database";
import { syncTierSelection, tierFilterLabel } from "./tier-filter";

describe("tierFilterLabel", () => {
  it("names the current selection", () => {
    expect(tierFilterLabel([...TIERS])).toBe("All tiers");
    expect(tierFilterLabel([])).toBe("No tiers");
    expect(tierFilterLabel(["tbr", "a"] as Tier[])).toBe(`${TIER_LABELS.tbr}, ${TIER_LABELS.a}`);
  });
});

describe("syncTierSelection", () => {
  it("checks every tier when All is checked", () => {
    const all = { checked: true };
    const tiers = [{ checked: false }, { checked: true }];
    syncTierSelection(all, all, tiers);
    expect(tiers.map((tier) => tier.checked)).toEqual([true, true]);
  });

  it("unchecks every tier when All is unchecked", () => {
    const all = { checked: false };
    const tiers = [{ checked: true }, { checked: true }];
    syncTierSelection(all, all, tiers);
    expect(tiers.map((tier) => tier.checked)).toEqual([false, false]);
  });

  it("checks All when every tier is checked", () => {
    const all = { checked: false };
    const tiers = [{ checked: true }, { checked: true }];
    syncTierSelection(tiers[0], all, tiers);
    expect(all.checked).toBe(true);
  });

  it("unchecks All when a tier is unchecked", () => {
    const all = { checked: true };
    const tiers = [{ checked: true }, { checked: false }];
    syncTierSelection(tiers[1], all, tiers);
    expect(all.checked).toBe(false);
  });
});
