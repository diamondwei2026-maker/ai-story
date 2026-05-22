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
