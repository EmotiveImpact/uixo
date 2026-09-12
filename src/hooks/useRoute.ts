import { useCallback, useEffect, useState } from 'react';
import { readRoute, routeToHref } from '../lib/url';
import type { RouteState } from '../lib/url';

/** Neon Auth puts this on the URL after Google. Do not drop it before get-session runs. */
const AUTH_QUERY_KEYS = ['neon_auth_session_verifier'] as const;

function hrefWithAuthParams(href: string): string {
  const next = new URL(href, window.location.origin);
  const current = new URLSearchParams(window.location.search);
  for (const key of AUTH_QUERY_KEYS) {
    const value = current.get(key);
    if (value) next.searchParams.set(key, value);
  }
  return `${next.pathname}${next.search}`;
}

/** Route keys that represent navigation, and so deserve a history entry of their own. */
const NAVIGATION_KEYS: (keyof RouteState)[] = [
  'category',
  'sub',
  'listId',
  'resourceId',
  'collectionSlug',
  'collectionsIndex',
  'dashboard',
  'review',
  'admin',
  'notFound',
  'landing',
];

function isNavigation(a: RouteState, b: RouteState): boolean {
  return NAVIGATION_KEYS.some((key) => a[key] !== b[key]);
}

/**
 * The single source of truth for what the visitor is looking at, kept in the URL so every
 * view is linkable and the browser's back and forward buttons work.
 */
export function useRoute() {
  const [route, setRoute] = useState<RouteState>(readRoute);

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback(
    (next: Partial<RouteState> | ((current: RouteState) => RouteState)) => {
      setRoute((current) => {
        const merged = typeof next === 'function' ? next(current) : { ...current, ...next };
        // The landing page is a surface you leave the moment you navigate anywhere else, so a
        // partial update that does not name `landing` is always taken as leaving it.
        const staysOnLanding = typeof next === 'function' || 'landing' in next;
        const resolved = staysOnLanding ? merged : { ...merged, landing: false };
        const href = hrefWithAuthParams(routeToHref(resolved));
        if (href !== window.location.pathname + window.location.search) {
          // Filter tweaks replace the entry; moving between views adds one.
          if (isNavigation(current, resolved)) window.history.pushState(null, '', href);
          else window.history.replaceState(null, '', href);
        }
        return resolved;
      });
    },
    [],
  );

  return { route, navigate };
}
