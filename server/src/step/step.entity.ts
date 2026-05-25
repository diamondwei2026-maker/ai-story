export type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING';

export type StepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'AI_GENERATING'
  | 'AWAITING_REVIEW'
  | 'REVIEWING'
  | 'CONFIRMED'
  | 'REJECTED';

export interface StepData {
  id: string;
  projectId: string;
  phaseType: PhaseType;
  status: StepStatus;
  input: string | null;
  output: string | null;
  review: Record<string, unknown> | null;
  version: number;
  confirmedAt: Date | null;
}

export type BeatStatus = 'PENDING' | 'STALE' | 'CONFIRMED';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface TargetedFixEntry {
  patchedAt: Date;
  sourceChapterId: string;
  changeFingerprint: string;
  summary: string;
}

export interface ChapterData {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string | null;
  beatPlan: Record<string, unknown> | null;
  targetWordCount: number;
  content: string | null;
  status: 'PENDING' | 'DRAFT' | 'REVIEWING' | 'COMPLETED' | 'DISPUTED';
  chapterFingerprint: string | null;
  contextSummary: string | null;
  reviewResult: Record<string, unknown> | null;
  changeAnalysis: Record<string, unknown> | null;
  targetedFixHistory: TargetedFixEntry[];
  createdAt: Date;
  updatedAt: Date;
}
