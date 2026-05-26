import { request } from './common';

export interface OutlineResponse {
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

export async function generateOutline(
  projectId: string,
  opts: { setting?: string; structure?: string; currentContent?: string },
): Promise<OutlineResponse> {
  return request(`/projects/${projectId}/steps/outline/generate`, {
    method: 'POST',
    body: JSON.stringify({
      setting: opts.setting ?? '',
      structure: opts.structure ?? 'three-act',
      currentContent: opts.currentContent ?? '',
    }),
  });
}

export async function confirmOutline(
  projectId: string,
): Promise<OutlineResponse> {
  return request(`/projects/${projectId}/steps/outline/confirm`, {
    method: 'POST',
  });
}

export async function rejectOutline(
  projectId: string,
): Promise<OutlineResponse> {
  return request(`/projects/${projectId}/steps/outline/reject`, {
    method: 'POST',
  });
}

export async function switchStructure(
  projectId: string,
  structure: string,
): Promise<OutlineResponse> {
  return request(`/projects/${projectId}/steps/outline/switch-structure`, {
    method: 'POST',
    body: JSON.stringify({ structure }),
  });
}

export async function getOutline(
  projectId: string,
): Promise<OutlineResponse | null> {
  const res = await fetch(`/api/projects/${projectId}/steps/outline`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '获取大纲失败' }));
    throw new Error(err.message || '获取大纲失败');
  }
  return res.json();
}
