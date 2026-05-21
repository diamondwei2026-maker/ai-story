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
