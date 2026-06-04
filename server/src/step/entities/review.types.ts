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
