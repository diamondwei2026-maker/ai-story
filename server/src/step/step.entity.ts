export type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING';

export type StepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'AI_GENERATING'
  | 'AWAITING_REVIEW'
  | 'REVIEWING'
  | 'CONFIRMED'
  | 'REJECTED';

export interface AiMeta {
  modelUsed: string;
  degraded: boolean;
  failed?: boolean;
}

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
  aiMeta?: AiMeta;
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

export type ReviewVerdict =
  | 'PASS'
  | 'PASS_WITH_SUGGESTIONS'
  | 'NEEDS_REVISION'
  | 'BLOCKED';

export type ReviewIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ReviewIssue {
  severity: ReviewIssueSeverity;
  location: string;
  rule: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface ReviewDimensionResult {
  score: number;
  issues: ReviewIssue[];
}

export interface ReviewResult {
  verdict: ReviewVerdict;
  dimensions: {
    POLITICAL_SAFETY: ReviewDimensionResult;
    SEXUAL_CONTENT: ReviewDimensionResult;
    VIOLENCE: ReviewDimensionResult;
    VALUES: ReviewDimensionResult;
  };
  overallScore: number;
  appealCount: number;
  appealedAt?: string;
  reviewedAt: string;
}

export interface ReviewAction {
  key: string;
  label: string;
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
