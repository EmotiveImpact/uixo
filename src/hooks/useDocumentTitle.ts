import { useEffect } from 'react';

export const SITE_TITLE = 'UIXO · Live UI components and design resources';

/**
 * Give every view its own tab title, so tabs, bookmarks and history stay tellable apart.
 * `null` means the site title; `undefined` leaves the current title alone (still loading).
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = title ? `${title} · UIXO` : SITE_TITLE;
    // A dialog that sets its own title hands the page's back when it closes.
    return () => {
      document.title = previous;
    };
  }, [title]);
}
