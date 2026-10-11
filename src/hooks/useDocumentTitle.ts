import { useEffect } from 'react';

export const SITE_TITLE = 'UIXO · Live UI components and design resources';

/** Give every view its own tab title, so tabs, bookmarks and history stay tellable apart. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · UIXO` : SITE_TITLE;
  }, [title]);
}
