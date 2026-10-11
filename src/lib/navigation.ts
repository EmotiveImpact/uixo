/**
 * Moves between UIXO's top-level surfaces without reloading the document.
 * Every mounted route store listens for popstate, so dispatching it after
 * pushState keeps the URL, browser history and visible workspace in sync.
 */
export function isAssetWorkspacePath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/browse/assets';
}

export function navigateInApp(href: string): void {
  const target = new URL(href, window.location.origin);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }

  const next = `${target.pathname}${target.search}${target.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  window.history.pushState(window.history.state, '', next);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

/** The one Saved page, on its websites tab. Old links to the favourites list land here. */
export const SAVED_WEBSITES_HREF = '/browse/assets?view=saved&tab=websites';

/** Swap the current entry for another in-app address, so Back never returns to the old one. */
export function replaceInApp(href: string): void {
  window.history.replaceState(window.history.state, '', href);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

/** The favourites list became the Saved page's websites tab. */
export function redirectLegacySaves(): boolean {
  if (window.location.pathname.replace(/\/+$/, '') !== '/list/favourites') return false;
  window.history.replaceState(window.history.state, '', SAVED_WEBSITES_HREF);
  return true;
}
