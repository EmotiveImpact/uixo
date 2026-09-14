import { useSyncExternalStore } from 'react';
const subscribe = (listener) => {
  window.addEventListener('uixo-theme', listener);
  return () => window.removeEventListener('uixo-theme', listener);
};
const snapshot = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot);
  return {
    theme,
    resolvedTheme: theme,
    setTheme(value) {
      document.documentElement.classList.toggle('dark', value === 'dark');
      window.dispatchEvent(new Event('uixo-theme'));
    },
  };
}
