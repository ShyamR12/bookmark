import { describe, expect, it, vi } from "vitest";
import { createLiveStatus } from "./status";

function fakeEl() {
  let text = "";
  return {
    get textContent() {
      return text;
    },
    set textContent(value: string) {
      text = value;
    },
    classList: {
      toggle: vi.fn()
    }
  };
}

describe("createLiveStatus", () => {
  it("keeps error text until a later status replaces it", () => {
    const el = fakeEl();
    const { setStatus } = createLiveStatus(el);
    setStatus("Couldn’t save this bookmark. Please try again.", true);
    expect(el.textContent).toBe("Couldn’t save this bookmark. Please try again.");
    expect(el.classList.toggle).toHaveBeenCalledWith("error", true);
  });
});
