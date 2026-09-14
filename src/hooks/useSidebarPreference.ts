import { useSyncExternalStore } from 'react';
const KEY = 'uixo.sidebar.expanded';
const EVENT = 'uixo:sidebar-preference';
let fallback = true;
function snapshot() {
  try {
    const value = localStorage.getItem(KEY);
    return value === null ? fallback : value !== 'false';
  } catch {
    return fallback;
  }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', storage);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener('storage', storage);
    window.removeEventListener(EVENT, listener);
  };
}
function setExpanded(expanded: boolean) {
  fallback = expanded;
  try {
    localStorage.setItem(KEY, String(expanded));
  } catch {
    /* Keep it for this session if storage is unavailable. */
  }
  window.dispatchEvent(new Event(EVENT));
}
/** One desktop preference across catalogue, collections and admin; mobile remains independent. */
export function useSidebarPreference() {
  return [useSyncExternalStore(subscribe, snapshot, () => true), setExpanded] as const;
}
