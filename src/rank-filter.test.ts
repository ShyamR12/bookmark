import { describe, expect, it } from "vitest";
import { RANK_LABELS, RANKS, type Rank } from "./database";
import { rankFilterLabel } from "./rank-filter";

describe("rankFilterLabel", () => {
  it("names the current selection", () => {
    expect(rankFilterLabel([...RANKS])).toBe("All ranks");
    expect(rankFilterLabel([])).toBe("No ranks");
    expect(rankFilterLabel(["tbr", "a"] as Rank[])).toBe(`${RANK_LABELS.tbr}, ${RANK_LABELS.a}`);
  });
});
