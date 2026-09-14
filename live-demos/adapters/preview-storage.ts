/** Demo-only persistence. Original controls may save state, but never touch UIXO's storage. */
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.get(String(key)) ?? null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    },
  };
}
Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });
const cookies = new Map<string, string>();
Object.defineProperty(document, 'cookie', {
  configurable: true,
  get() {
    return [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  },
  set(value: string) {
    const [pair] = String(value).split(';');
    const split = pair.indexOf('=');
    if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1));
  },
});
