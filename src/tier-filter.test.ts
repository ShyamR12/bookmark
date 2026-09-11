import { describe, expect, it } from "vitest";
import { toggleAllTiers } from "./tier-filter";

describe("toggleAllTiers", () => {
  it("checks every tier when any are unchecked", () => {
    const tiers = [{ checked: false }, { checked: true }];
    toggleAllTiers(tiers);
    expect(tiers.map((tier) => tier.checked)).toEqual([true, true]);
  });

  it("checks every tier when none are checked", () => {
    const tiers = [{ checked: false }, { checked: false }];
    toggleAllTiers(tiers);
    expect(tiers.map((tier) => tier.checked)).toEqual([true, true]);
  });

  it("unchecks every tier when all are checked", () => {
    const tiers = [{ checked: true }, { checked: true }];
    toggleAllTiers(tiers);
    expect(tiers.map((tier) => tier.checked)).toEqual([false, false]);
  });
});
