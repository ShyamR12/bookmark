import { describe, expect, it } from "vitest";
import { RANK_LABELS, RANKS, type Rank } from "./database";
import { rankFilterLabel, syncRankSelection } from "./rank-filter";

describe("rankFilterLabel", () => {
  it("names the current selection", () => {
    expect(rankFilterLabel([...RANKS])).toBe("All ranks");
    expect(rankFilterLabel([])).toBe("No ranks");
    expect(rankFilterLabel(["tbr", "a"] as Rank[])).toBe(`${RANK_LABELS.tbr}, ${RANK_LABELS.a}`);
  });
});

describe("syncRankSelection", () => {
  it("checks every rank when All is checked", () => {
    const all = { checked: true };
    const ranks = [{ checked: false }, { checked: true }];
    syncRankSelection(all, all, ranks);
    expect(ranks.map((rank) => rank.checked)).toEqual([true, true]);
  });

  it("unchecks every rank when All is unchecked", () => {
    const all = { checked: false };
    const ranks = [{ checked: true }, { checked: true }];
    syncRankSelection(all, all, ranks);
    expect(ranks.map((rank) => rank.checked)).toEqual([false, false]);
  });

  it("checks All when every rank is checked", () => {
    const all = { checked: false };
    const ranks = [{ checked: true }, { checked: true }];
    syncRankSelection(ranks[0], all, ranks);
    expect(all.checked).toBe(true);
  });

  it("unchecks All when a rank is unchecked", () => {
    const all = { checked: true };
    const ranks = [{ checked: true }, { checked: false }];
    syncRankSelection(ranks[1], all, ranks);
    expect(all.checked).toBe(false);
  });
});
