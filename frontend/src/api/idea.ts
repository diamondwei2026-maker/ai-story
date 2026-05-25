import { request } from './common';

export interface IdeaResponse {
  id: string;
  projectId: string;
  phaseType: string;
  status: string;
  output: string;
  review: Record<string, unknown>;
  version: number;
  confirmedAt?: string | null;
}

export async function generateIdea(
  projectId: string,
  opts: { idea?: string; feedback?: string },
): Promise<IdeaResponse> {
  return request(`/projects/${projectId}/steps/idea/generate`, {
    method: 'POST',
    body: JSON.stringify({ idea: opts.idea ?? '', feedback: opts.feedback ?? '' }),
  });
}

export async function generateIdeaSummary(
  projectId: string,
  opts: { selectedSellPoint?: number; customBrief?: string },
): Promise<IdeaResponse> {
  return request(`/projects/${projectId}/steps/idea/summary`, {
    method: 'POST',
    body: JSON.stringify({
      selectedSellPoint: opts.selectedSellPoint,
      customBrief: opts.customBrief ?? '',
    }),
  });
}

export async function confirmIdea(
  projectId: string,
  opts: { selectedSellPoint: number; customBrief?: string },
): Promise<IdeaResponse> {
  return request(`/projects/${projectId}/steps/idea/confirm`, {
    method: 'POST',
    body: JSON.stringify({
      selectedSellPoint: opts.selectedSellPoint,
      customBrief: opts.customBrief ?? '',
    }),
  });
}

export async function rejectIdea(projectId: string): Promise<IdeaResponse> {
  return request(`/projects/${projectId}/steps/idea/reject`, {
    method: 'POST',
  });
}

export async function getIdea(projectId: string): Promise<IdeaResponse | null> {
  const res = await fetch(`/api/projects/${projectId}/steps/idea`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '获取灵感失败' }));
    throw new Error(err.message || '获取灵感失败');
  }
  return res.json();
}
