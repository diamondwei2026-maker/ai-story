import { request } from './common';
import type { StepDataResponse } from './common';

export interface BeatDataResponse {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBeats(
  projectId: string,
): Promise<BeatDataResponse[]> {
  return request(`/projects/${projectId}/steps/beats`);
}

export async function generateBeats(
  projectId: string,
  opts: { outline?: string; currentContent?: string },
): Promise<BeatDataResponse[]> {
  return request(`/projects/${projectId}/steps/beats/generate`, {
    method: 'POST',
    body: JSON.stringify({
      outline: opts.outline ?? '',
      currentContent: opts.currentContent ?? '',
    }),
  });
}

export async function confirmBeats(
  projectId: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/beats/confirm`, {
    method: 'POST',
  });
}

export async function rejectBeats(
  projectId: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/beats/reject`, {
    method: 'POST',
  });
}
