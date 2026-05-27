import { request, getOrNull, StepDataResponse } from './common';

export async function generateIdea(
  projectId: string,
  opts: { idea?: string; feedback?: string },
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/idea/generate`, {
    method: 'POST',
    body: JSON.stringify({ idea: opts.idea ?? '', feedback: opts.feedback ?? '' }),
  });
}

export async function generateIdeaSummary(
  projectId: string,
  opts: { selectedSellPoint?: number; customBrief?: string },
): Promise<StepDataResponse> {
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
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/idea/confirm`, {
    method: 'POST',
    body: JSON.stringify({
      selectedSellPoint: opts.selectedSellPoint,
      customBrief: opts.customBrief ?? '',
    }),
  });
}

export async function rejectIdea(projectId: string): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/idea/reject`, {
    method: 'POST',
  });
}

export async function getIdea(projectId: string): Promise<StepDataResponse | null> {
  return getOrNull(`/projects/${projectId}/steps/idea`);
}
