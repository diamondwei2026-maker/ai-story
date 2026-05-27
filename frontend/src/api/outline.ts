import { request, getOrNull, StepDataResponse } from './common';

export async function generateOutline(
  projectId: string,
  opts: { setting?: string; structure?: string; currentContent?: string },
): Promise<StepDataResponse> {
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
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/outline/confirm`, {
    method: 'POST',
  });
}

export async function rejectOutline(
  projectId: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/outline/reject`, {
    method: 'POST',
  });
}

export async function switchStructure(
  projectId: string,
  structure: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/outline/switch-structure`, {
    method: 'POST',
    body: JSON.stringify({ structure }),
  });
}

export async function getOutline(
  projectId: string,
): Promise<StepDataResponse | null> {
  return getOrNull(`/projects/${projectId}/steps/outline`);
}
