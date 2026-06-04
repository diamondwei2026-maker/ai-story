import type { ReviewResult } from './review.types';

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
  reviewResult: ReviewResult | Record<string, unknown> | null;
  changeAnalysis: Record<string, unknown> | null;
  targetedFixHistory: TargetedFixEntry[];
  createdAt: Date;
  updatedAt: Date;
}
