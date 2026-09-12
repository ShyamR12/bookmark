export const SAVED_MESSAGE = "Saved to your reading list.";
export const SAVED_MESSAGE_MS = 3000;

export function createLiveStatus(el: { textContent: string | null; classList: { toggle(token: string, force?: boolean): void } }) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function setStatus(message: string, error = false) {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  function setTemporaryStatus(message: string, durationMs: number) {
    setStatus(message);
    timer = setTimeout(() => {
      timer = undefined;
      if (el.textContent === message) setStatus("");
    }, durationMs);
  }

  return { setStatus, setTemporaryStatus };
}
