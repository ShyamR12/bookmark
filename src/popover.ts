export function showManualPopover(el: { matches(selector: string): boolean; showPopover(): void }) {
  if (!el.matches(":popover-open")) el.showPopover();
}

export function hideManualPopover(el: { matches(selector: string): boolean; hidePopover(): void }) {
  if (el.matches(":popover-open")) el.hidePopover();
}
