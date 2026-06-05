// ─── Shared type definitions ─────────────────────────────────────────
// Used by EditorWorkspace, ReviewPanel, and their tests

export interface ReviewIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  rule: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface ReviewResult {
  verdict: 'PASS' | 'PASS_WITH_SUGGESTIONS' | 'NEEDS_REVISION' | 'BLOCKED';
  dimensions: {
    POLITICAL_SAFETY: { score: number; issues: ReviewIssue[] };
    SEXUAL_CONTENT: { score: number; issues: ReviewIssue[] };
    VIOLENCE: { score: number; issues: ReviewIssue[] };
    VALUES: { score: number; issues: ReviewIssue[] };
  };
  overallScore: number;
  appealCount: number;
  reviewedAt: string;
  appealedAt?: string;
}

// ─── Chapter status constants ────────────────────────────────────────

export const CHAPTER_STATUS_LABEL: Record<string, string> = {
  PENDING: '待生成',
  DRAFT: '生成中',
  REVIEWING: '审核中',
  COMPLETED: '已完成',
  DISPUTED: '已标记争议',
};

export const CHAPTER_STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  DRAFT: 'processing',
  REVIEWING: 'orange',
  COMPLETED: 'green',
  DISPUTED: 'red',
};

export const TERMINAL_CHAPTER_STATUSES = new Set(['COMPLETED', 'DISPUTED']);
export const ACTIVE_CHAPTER_STATUSES = new Set(['DRAFT', 'REVIEWING']);

// ─── Pure utility helpers ──────────────────────────────────────────────

/** 将后端章节状态码映射为中文展示文本 */
export function chapterStatusLabel(status: string): string {
  return CHAPTER_STATUS_LABEL[status] ?? status;
}

/** 将后端章节状态码映射为 Ant Design Tag 颜色 */
export function chapterStatusColor(status: string): string {
  return CHAPTER_STATUS_COLOR[status] ?? 'default';
}
