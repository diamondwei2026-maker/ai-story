const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface StepDataResponse {
  id: string;
  projectId: string;
  phaseType: string;
  status: string;
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
      return res.json() as Promise<T>;
    } finally {
      inFlight.delete(cacheKey);
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
      return res.json() as Promise<T>;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}
