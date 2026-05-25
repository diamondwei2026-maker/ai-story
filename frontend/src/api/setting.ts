import { request } from './common';

export interface SettingResponse {
  id: string;
  projectId: string;
  phaseType: string;
  status: string;
  output: string;
  review: Record<string, unknown>;
  version: number;
  confirmedAt?: string | null;
}

export async function generateSetting(
  projectId: string,
  opts: { idea?: string; currentContent?: string },
): Promise<SettingResponse> {
  return request(`/projects/${projectId}/steps/setting/generate`, {
    method: 'POST',
    body: JSON.stringify({ idea: opts.idea ?? '', currentContent: opts.currentContent ?? '' }),
  });
}

export async function confirmSetting(
  projectId: string,
): Promise<SettingResponse> {
  return request(`/projects/${projectId}/steps/setting/confirm`, {
    method: 'POST',
  });
}

export async function rejectSetting(
  projectId: string,
): Promise<SettingResponse> {
  return request(`/projects/${projectId}/steps/setting/reject`, {
    method: 'POST',
  });
}

export async function getSetting(
  projectId: string,
): Promise<SettingResponse | null> {
  const res = await fetch(`/api/projects/${projectId}/steps/setting`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '获取设定失败' }));
    throw new Error(err.message || '获取设定失败');
  }
  return res.json();
}
