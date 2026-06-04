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
