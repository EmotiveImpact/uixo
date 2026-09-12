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
