import { describe, expect, it } from "vitest";
import { RANK_LABELS, RANKS, type Rank } from "./database";
import { rankFilterLabel, selectedRanks } from "./rank-filter";

describe("selectedRanks", () => {
  it("returns every rank when All is checked", () => {
    expect(selectedRanks(true, ["tbr"])).toEqual([...RANKS]);
  });

  it("returns only the checked ranks otherwise", () => {
    expect(selectedRanks(false, ["tbr", "s"])).toEqual(["tbr", "s"]);
  });
});

describe("rankFilterLabel", () => {
  it("names the current selection", () => {
    expect(rankFilterLabel(true, [...RANKS])).toBe("All ranks");
    expect(rankFilterLabel(false, [])).toBe("No ranks");
    expect(rankFilterLabel(false, ["tbr", "a"] as Rank[])).toBe(`${RANK_LABELS.tbr}, ${RANK_LABELS.a}`);
  });
});
