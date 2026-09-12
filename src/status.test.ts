import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVED_MESSAGE, SAVED_MESSAGE_MS, createLiveStatus } from "./status";

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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps error text until a later status replaces it", () => {
    const el = fakeEl();
    const { setStatus } = createLiveStatus(el);
    setStatus("Couldn’t save this bookmark. Please try again.", true);
    vi.advanceTimersByTime(SAVED_MESSAGE_MS);
    expect(el.textContent).toBe("Couldn’t save this bookmark. Please try again.");
    expect(el.classList.toggle).toHaveBeenCalledWith("error", true);
  });

  it("clears a saved confirmation after a few seconds", () => {
    const el = fakeEl();
    const { setTemporaryStatus } = createLiveStatus(el);
    setTemporaryStatus(SAVED_MESSAGE, SAVED_MESSAGE_MS);
    expect(el.textContent).toBe(SAVED_MESSAGE);
    expect(el.classList.toggle).toHaveBeenCalledWith("error", false);
    vi.advanceTimersByTime(SAVED_MESSAGE_MS - 1);
    expect(el.textContent).toBe(SAVED_MESSAGE);
    vi.advanceTimersByTime(1);
    expect(el.textContent).toBe("");
  });

  it("cancels a pending clear when a later status is set", () => {
    const el = fakeEl();
    const { setStatus, setTemporaryStatus } = createLiveStatus(el);
    setTemporaryStatus(SAVED_MESSAGE, SAVED_MESSAGE_MS);
    setStatus("Your reading list is empty");
    vi.advanceTimersByTime(SAVED_MESSAGE_MS);
    expect(el.textContent).toBe("Your reading list is empty");
  });
});
