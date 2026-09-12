import { useCallback, useEffect, useState } from 'react';
import { ASSET_SAVES, parseSavedAssets } from '../lib/asset-library';

const CHANGED = 'uixo:asset-saves-changed';
function readSaved() {
  try {
    return parseSavedAssets(localStorage.getItem(ASSET_SAVES));
  } catch {
    return [];
  }
}

/** Share browser-local asset saves between the sidebar, cards and other tabs. */
export function useAssetSaves() {
  const [saved, setSaved] = useState<string[]>(readSaved);
  useEffect(() => {
    const changed = (event: Event) => setSaved((event as CustomEvent<string[]>).detail);
    const storage = (event: StorageEvent) => {
      if (event.key === ASSET_SAVES || event.key === null) setSaved(readSaved());
    };
    window.addEventListener(CHANGED, changed);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(CHANGED, changed);
      window.removeEventListener('storage', storage);
    };
  }, []);
  const save = useCallback((next: string[]) => {
    let persisted = true;
    try {
      localStorage.setItem(ASSET_SAVES, JSON.stringify(next));
    } catch {
      persisted = false;
    }
    setSaved(next);
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: next }));
    return persisted;
  }, []);
  return { saved, save };
}
