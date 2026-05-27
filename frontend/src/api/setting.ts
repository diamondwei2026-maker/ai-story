import { request, getOrNull, StepDataResponse } from './common';

export async function generateSetting(
  projectId: string,
  opts: { idea?: string; currentContent?: string },
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/setting/generate`, {
    method: 'POST',
    body: JSON.stringify({ idea: opts.idea ?? '', currentContent: opts.currentContent ?? '' }),
  });
}

export async function confirmSetting(
  projectId: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/setting/confirm`, {
    method: 'POST',
  });
}

export async function rejectSetting(
  projectId: string,
): Promise<StepDataResponse> {
  return request(`/projects/${projectId}/steps/setting/reject`, {
    method: 'POST',
  });
}

export async function getSetting(
  projectId: string,
): Promise<StepDataResponse | null> {
  return getOrNull(`/projects/${projectId}/steps/setting`);
}
