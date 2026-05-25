const BASE = '/api';

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
