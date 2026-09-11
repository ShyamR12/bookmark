import { describe, expect, it, vi } from "vitest";
import { hideManualPopover, showManualPopover } from "./popover";

function fakePopover(open: boolean) {
  return {
    matches: vi.fn((selector: string) => selector === ":popover-open" && open),
    showPopover: vi.fn(),
    hidePopover: vi.fn()
  };
}

describe("showManualPopover", () => {
  it("opens a closed popover", () => {
    const el = fakePopover(false);
    showManualPopover(el);
    expect(el.showPopover).toHaveBeenCalledOnce();
  });

  it("does not reopen an already open popover", () => {
    const el = fakePopover(true);
    showManualPopover(el);
    expect(el.showPopover).not.toHaveBeenCalled();
  });
});

describe("hideManualPopover", () => {
  it("hides an open popover", () => {
    const el = fakePopover(true);
    hideManualPopover(el);
    expect(el.hidePopover).toHaveBeenCalledOnce();
  });

  it("does not hide a closed popover", () => {
    const el = fakePopover(false);
    hideManualPopover(el);
    expect(el.hidePopover).not.toHaveBeenCalled();
  });
});
