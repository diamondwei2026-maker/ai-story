export type BeatStatus = 'PENDING' | 'STALE' | 'CONFIRMED';

export interface ImpactResult {
  affectedChapterNumbers: number[];
  warnings: string[];
}

export interface HookCausalLink {
  hook: string;
  resolvesInChapter: number | null;
}

export interface BeatData {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: BeatStatus;
  narrativeSummary: string;
  conflictDescription: string;
  pacingLabel: string;
  hookCausalChain: HookCausalLink[];
  conflictIntensity: number;
  readerExpectation: number;
  createdAt: Date;
  updatedAt: Date;
}
