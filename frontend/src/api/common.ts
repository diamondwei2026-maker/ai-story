const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface StepDataResponse {
  id: string;
  projectId: string;
  phaseType: string;
  status: string;
  input?: string | null;
  output: string;
  review: Record<string, unknown>;
  version: number;
  confirmedAt?: string | null;
  aiMeta?: { modelUsed: string; degraded: boolean; failed?: boolean };
}

/**
 * In-flight request deduplication cache.
 * Prevents duplicate GET requests when multiple components mount simultaneously.
 * Only GET requests are cached; mutations (POST/PATCH/DELETE) always go through.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${url}`;

  // Deduplicate concurrent GET requests
  if (method === 'GET') {
    const pending = inFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '请求失败' }));
        throw new Error(err.message || '请求失败');
      }
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
    } finally {
      inFlight.delete(cacheKey);
      // 非 GET 请求完成后，清除相关 GET 缓存，避免后续 GET 返回过期数据
      if (method !== 'GET') {
        for (const [key] of inFlight) {
          if (key.startsWith('GET:') && url.startsWith(key.slice(4))) {
            inFlight.delete(key);
          }
        }
      }
    }
  })();

  if (method === 'GET') {
    inFlight.set(cacheKey, promise);
  }
  return promise;
}

export async function getOrNull<T>(url: string): Promise<T | null> {
  const cacheKey = `GET:${url}`;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending as Promise<T | null>;

  const promise = (async () => {
    try {
      const res = await fetch(`${BASE}${url}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '请求失败' }));
        throw new Error(err.message || '请求失败');
      }
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
