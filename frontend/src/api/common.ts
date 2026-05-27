const BASE = '/api';

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

export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '请求失败' }));
    throw new Error(err.message || '请求失败');
  }
  return res.json();
}

export async function getOrNull<T>(url: string): Promise<T | null> {
  const res = await fetch(`${BASE}${url}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '请求失败' }));
    throw new Error(err.message || '请求失败');
  }
  return res.json();
}
