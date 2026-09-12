export function createLiveStatus(el: { textContent: string | null; classList: { toggle(token: string, force?: boolean): void } }) {
  function setStatus(message: string, error = false) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }

  return { setStatus };
}
