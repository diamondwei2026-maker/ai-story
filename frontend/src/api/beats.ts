import { request } from './common';
import type { StepDataResponse } from './common';

export interface HookCausalLink {
  hook: string;
  resolvesInChapter: number | null;
}

export interface BeatDataResponse {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: 'PENDING' | 'STALE' | 'CONFIRMED';
  narrativeSummary: string;
  conflictDescription: string;
  pacingLabel: string;
  hookCausalChain: HookCausalLink[];
  conflictIntensity: number;
  readerExpectation: number;
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
  opts: { outline?: string; currentContent?: string; defaultWordCount?: number; targetChapterCount?: number },
): Promise<BeatDataResponse[]> {
  const body: Record<string, unknown> = {
    outline: opts.outline ?? '',
    currentContent: opts.currentContent ?? '',
  };
  if (opts.defaultWordCount != null) {
    body.defaultWordCount = opts.defaultWordCount;
  }
  if (opts.targetChapterCount != null) {
    body.targetChapterCount = opts.targetChapterCount;
  }
  return request(`/projects/${projectId}/steps/beats/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
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

// ─── Issue #23 / #24: Lightweight Beat Modifications ─────────────

export async function updateBeatWordCount(
  beatId: string,
  wordCount: number,
): Promise<BeatDataResponse> {
  return request(`/beats/${beatId}/wordcount`, {
    method: 'PATCH',
    body: JSON.stringify({ wordCount }),
  });
}

export async function updateBeatStructure(
  beatId: string,
  plan: Record<string, unknown>,
): Promise<BeatDataResponse> {
  return request(`/beats/${beatId}/structure`, {
    method: 'PATCH',
    body: JSON.stringify(plan),
  });
}

// ─── Issue #26 Phase 1: Beat Adjust & Batch Adjust ───────────────

export interface ImpactResponse {
  affectedChapterNumbers: number[];
  warnings: string[];
}

export interface AdjustBeatResponse {
  beat: BeatDataResponse;
  impact: ImpactResponse;
}

export interface BatchAdjustBeatsResponse {
  beats: BeatDataResponse[];
  impact: ImpactResponse;
}

export async function adjustBeat(
  projectId: string,
  beatId: string,
  feedback: string,
): Promise<AdjustBeatResponse> {
  return request(`/projects/${projectId}/steps/beats/${beatId}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
}

export async function batchAdjustBeats(
  projectId: string,
  startChapter: number,
  endChapter: number,
  problemDescription: string,
): Promise<BatchAdjustBeatsResponse> {
  return request(`/projects/${projectId}/steps/beats/batch-adjust`, {
    method: 'POST',
    body: JSON.stringify({ startChapter, endChapter, problemDescription }),
  });
}
