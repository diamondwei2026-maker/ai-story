<template>
  <div data-testid="review-panel" class="review-panel">
    <!-- Verdict badge -->
    <div class="review-panel__header">
      <span data-testid="verdict-badge" :class="verdictBadgeClass">
        {{ verdictLabel }}
      </span>
      <span data-testid="overall-score" class="review-panel__score">
        {{ reviewResult.overallScore.toFixed(1) }} / 10
      </span>
    </div>

    <!-- Dimension scores -->
    <div class="review-panel__dimensions">
      <div
        v-for="dim in dimensions"
        :key="dim.key"
        :data-testid="`dimension-${dim.key}`"
        class="review-dimension"
      >
        <span class="review-dimension__label">{{ dim.label }}</span>
        <span class="review-dimension__score">{{ dim.score }}</span>
      </div>
    </div>

    <!-- Issues list -->
    <div
      v-if="allIssues.length > 0"
      data-testid="review-issues"
      class="review-panel__issues"
    >
      <div
        v-for="(issue, idx) in allIssues"
        :key="idx"
        class="review-issue"
      >
        <span :class="`review-issue__severity review-issue__severity--${issue.severity.toLowerCase()}`">
          {{ issue.severity }}
        </span>
        <span class="review-issue__location">{{ issue.location }}</span>
        <span class="review-issue__suggestion">{{ issue.suggestion }}</span>
      </div>
    </div>

    <!-- Loading indicator -->
    <div
      v-if="loading"
      data-testid="review-loading-indicator"
      class="review-panel__loading"
    >
      处理中...
    </div>

    <!-- Action buttons -->
    <div class="review-panel__actions">
      <button
        v-for="action in availableActions"
        :key="action.key"
        :data-testid="`action-${action.key}`"
        class="review-panel__action-btn"
        :class="actionBtnClass(action.key)"
        :disabled="loading"
        @click="handleAction(action.key)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface ReviewIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  rule: string;
  suggestion: string;
  autoFixable: boolean;
}

interface ReviewResult {
  verdict: string;
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

const props = withDefaults(defineProps<{
  reviewResult: ReviewResult;
  chapterStatus: string;
  loading?: boolean;
}>(), {
  loading: false,
});

const emit = defineEmits<{
  'adopt-suggestions': [];
  'ignore-and-confirm': [];
  'adopt-and-re-review': [];
  'manual-edit': [];
  'appeal': [];
  'force-dispute': [];
}>();

const dimensions = [
  { key: 'POLITICAL_SAFETY', label: '政治安全' },
  { key: 'SEXUAL_CONTENT', label: '色情尺度' },
  { key: 'VIOLENCE', label: '暴力渲染' },
  { key: 'VALUES', label: '价值观' },
];

const verdictLabels: Record<string, string> = {
  PASS: 'PASS · 通过',
  PASS_WITH_SUGGESTIONS: '通过（有建议）',
  NEEDS_REVISION: '需要修改',
  BLOCKED: '审核不通过',
};

const verdictLabel = computed(() => {
  return verdictLabels[props.reviewResult.verdict] ?? props.reviewResult.verdict;
});

const verdictBadgeClass = computed(() => {
  const v = props.reviewResult.verdict;
  return {
    'verdict-badge': true,
    'verdict-badge--pass': v === 'PASS',
    'verdict-badge--suggestions': v === 'PASS_WITH_SUGGESTIONS',
    'verdict-badge--needs-revision': v === 'NEEDS_REVISION',
    'verdict-badge--blocked': v === 'BLOCKED',
  };
});

const allIssues = computed((): ReviewIssue[] => {
  const dims = props.reviewResult.dimensions;
  return [
    ...(dims.POLITICAL_SAFETY?.issues ?? []),
    ...(dims.SEXUAL_CONTENT?.issues ?? []),
    ...(dims.VIOLENCE?.issues ?? []),
    ...(dims.VALUES?.issues ?? []),
  ];
});

const VERDICT_ACTIONS: Record<string, { key: string; label: string }[]> = {
  PASS: [],
  PASS_WITH_SUGGESTIONS: [
    { key: 'adopt_suggestions', label: '采纳建议并重新审核' },
    { key: 'ignore_and_confirm', label: '忽略并确认' },
  ],
  NEEDS_REVISION: [
    { key: 'adopt_and_re_review', label: '采纳修改并重新审核' },
    { key: 'manual_edit', label: '手动修改正文' },
  ],
  BLOCKED: [{ key: 'manual_edit', label: '手动修改正文' }],
};

function pushAppealAction(
  actions: { key: string; label: string }[],
): void {
  if (props.reviewResult.appealCount < 1) {
    actions.push({ key: 'appeal', label: '上诉' });
  } else {
    actions.push({ key: 'force_dispute', label: '强制标记 DISPUTED' });
  }
}

const availableActions = computed(() => {
  const actions = [
    ...(VERDICT_ACTIONS[props.reviewResult.verdict] ?? []),
  ];
  if (
    props.reviewResult.verdict === 'NEEDS_REVISION' ||
    props.reviewResult.verdict === 'BLOCKED'
  ) {
    pushAppealAction(actions);
  }
  return actions;
});

function actionBtnClass(key: string): Record<string, boolean> {
  return {
    'review-panel__action-btn': true,
    'review-panel__action-btn--primary': key === 'adopt_suggestions' || key === 'adopt_and_re_review',
    'review-panel__action-btn--danger': key === 'force_dispute',
    'review-panel__action-btn--appeal': key === 'appeal',
  };
}

function handleAction(key: string) {
  const event = key.replace(/_/g, '-') as
    | 'adopt-suggestions'
    | 'ignore-and-confirm'
    | 'adopt-and-re-review'
    | 'manual-edit'
    | 'appeal'
    | 'force-dispute';
  emit(event);
}
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.review-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.review-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.verdict-badge {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 4px;
}

.verdict-badge--pass { background: #e6f7e6; color: #2d7d2d; }
.verdict-badge--suggestions { background: #fff7e6; color: #b8860b; }
.verdict-badge--needs-revision { background: #ffe6e6; color: #c0392b; }
.verdict-badge--blocked { background: #f5e6e6; color: #a71d2a; }

.review-panel__score {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.review-panel__dimensions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.review-dimension {
  text-align: center;
  padding: 8px 4px;
  background: var(--color-bg);
  border-radius: 4px;
}

.review-dimension__label {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.review-dimension__score {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.review-panel__issues {
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.review-issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.review-issue__severity {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.review-issue__severity--critical { background: #f5e6e6; color: #a71d2a; }
.review-issue__severity--high { background: #ffe6e6; color: #c0392b; }
.review-issue__severity--medium { background: #fff4e6; color: #b8860b; }
.review-issue__severity--low { background: #e6f0ff; color: #2d5fa0; }

.review-issue__location {
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.review-issue__suggestion {
  color: var(--color-text-primary);
  flex: 1;
}

.review-panel__loading {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 8px;
  font-size: 13px;
}

.review-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.review-panel__action-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  color: var(--color-text-primary);
  transition: background-color 0.2s;
}

.review-panel__action-btn:hover:not(:disabled) {
  background: var(--color-bg);
}

.review-panel__action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.review-panel__action-btn--primary {
  background: var(--color-gold);
  color: #fff;
  border-color: var(--color-gold);
}

.review-panel__action-btn--primary:hover:not(:disabled) {
  background: var(--color-gold-dark);
}

.review-panel__action-btn--danger {
  border-color: #a71d2a;
  color: #a71d2a;
}

.review-panel__action-btn--danger:hover:not(:disabled) {
  background: #fdf0f0;
}

.review-panel__action-btn--appeal {
  border-color: #b8860b;
  color: #b8860b;
}

.review-panel__action-btn--appeal:hover:not(:disabled) {
  background: #fff9f0;
}
</style>
