import { request } from './common';
import type { Chapter } from '@/stores/useChapterStore';

export async function getChapters(projectId: string): Promise<Chapter[]> {
  return request<Chapter[]>(`/projects/${projectId}/chapters`);
}

export async function generateChapter(
  projectId: string,
  chapterId: string,
  body: { mode: string; feedback?: string },
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function confirmChapter(
  projectId: string,
  chapterId: string,
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/confirm`,
    { method: 'POST' },
  );
}

export async function disputeChapter(
  projectId: string,
  chapterId: string,
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/dispute`,
    { method: 'POST' },
  );
}

export async function pauseChapter(
  projectId: string,
  chapterId: string,
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/pause`,
    { method: 'POST' },
  );
}

export async function continueChapter(
  projectId: string,
  chapterId: string,
  body: { currentContent: string },
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/continue`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function retryChapter(
  projectId: string,
  chapterId: string,
  body: { mode: string; feedback?: string },
): Promise<Chapter> {
  return request<Chapter>(
    `/projects/${projectId}/chapters/${chapterId}/retry`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export interface ImpactedChapter {
  chapterNumber: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reason: string;
  status: 'PENDING' | 'FIXED' | 'SKIPPED' | 'DEFERRED';
}

export interface ChangeAnalysisData {
  lastAnalyzedAt: string;
  sourceChangeFingerprint: string;
  impactedChapters: ImpactedChapter[];
}

export interface AnalyzeChangeResponse {
  skipped: boolean;
  reason?: string;
  changeAnalysis?: ChangeAnalysisData;
}

export interface TargetedFixResponse {
  patchContent: string;
}

export async function analyzeChange(
  projectId: string,
  chapterId: string,
  newContent: string,
): Promise<AnalyzeChangeResponse> {
  return request<AnalyzeChangeResponse>(
    `/projects/${projectId}/chapters/${chapterId}/analyze-change`,
    {
      method: 'POST',
      body: JSON.stringify({ newContent }),
    },
  );
}

export async function applyTargetedFix(
  projectId: string,
  chapterId: string,
  impactedChapterId: string,
): Promise<TargetedFixResponse> {
  return request<TargetedFixResponse>(
    `/projects/${projectId}/chapters/${chapterId}/targeted-fix`,
    {
      method: 'POST',
      body: JSON.stringify({ impactedChapterId }),
    },
  );
}
