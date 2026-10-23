/** True when the key press means "open search": ⌘K on a Mac, Ctrl+K elsewhere. */
export const isPaletteShortcut = (event: KeyboardEvent) =>
  event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey;

export const OPEN_SEARCH_EVENT = 'uixo:open-search';

/** Asks the shared search palette to open, from a header pill or any other control. */
export function openSearchPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
