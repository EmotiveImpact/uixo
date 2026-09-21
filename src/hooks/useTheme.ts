import { useEffect, useState } from 'react';
import { readStored, writeStored, THEME_KEY } from '../lib/storage';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const requested = new URLSearchParams(window.location.search).get('appearance');
  if (requested === 'dark' || requested === 'light') return requested;
  const stored = readStored<Theme | null>(THEME_KEY, null);
  if (stored === 'light' || stored === 'dark') return stored;
  // No stored choice: follow the operating system rather than assuming dark.
  const prefersLight =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

/**
 * Mirrors the theme onto <html> as `dark` / `light`, which is what styles.css and the
 * `dark:` Tailwind variant key off, and remembers the visitor's choice.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    writeStored(THEME_KEY, theme);
  }, [theme]);

  const light = theme === 'light';
  return { light, toggle: () => setTheme(light ? 'dark' : 'light') };
}
