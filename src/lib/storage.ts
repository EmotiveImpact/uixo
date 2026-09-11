/**
 * Read a JSON value from localStorage, falling back when the key is missing,
 * unparseable, or storage is unavailable (private mode, blocked cookies).
 */
export function readStored<T>(key: string, fallback: T, store?: Storage): T {
  try {
    return JSON.parse((store ?? localStorage).getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

/** Write a JSON value to localStorage, reporting whether it stuck. */
export function writeStored(key: string, value: unknown, store?: Storage): boolean {
  try {
    (store ?? localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const LISTS_KEY = 'uixo-lists';
export const SUGGESTIONS_KEY = 'uixo-suggestions';
export const REPORTS_KEY = 'uixo-link-reports';
export const THEME_KEY = 'uixo-theme';
/** Session-scoped: closing the tab signs the curator out. */
export const CURATOR_TOKEN_KEY = 'uixo-curator-token';
export const CANDIDATES_KEY = 'uixo-candidates';
export const REVIEWS_KEY = 'uixo-candidate-reviews';
export const DENSITY_KEY = 'uixo-density';

/** Earlier shapes of the same data, migrated on first load. */
export const LEGACY_FAVOURITES_KEY = 'uilist-favourites';
export const LEGACY_COLLECTIONS_KEY = 'uixo-collections';
