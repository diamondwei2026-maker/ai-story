export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch { /* ignore parse errors */ }
  return fallback;
}

export function saveJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export interface StorePersistence<T> {
  load: () => T;
  save: (state: T) => void;
}

export function createStorePersistence<T>(key: string, fallback: T): StorePersistence<T> {
  return {
    load: () => loadJSON(key, fallback),
    save: (state: T) => saveJSON(key, state),
  };
}
