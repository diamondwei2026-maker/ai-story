<template>
  <div data-testid="review-panel" class="review-panel">
    <!-- Verdict badge -->
    <div class="review-panel__header">
      <a-tag data-testid="verdict-badge" :color="verdictColor">{{ verdictLabel }}</a-tag>
      <span data-testid="overall-score" class="review-panel__score">
        {{ reviewResult.overallScore.toFixed(1) }} / 10
      </span>
    </div>

    <!-- Dimension scores -->
    <a-descriptions :column="4" size="small" bordered class="review-panel__dimensions">
      <a-descriptions-item
        v-for="dim in dimensionScores"
        :key="dim.key"
        :label="dim.label"
        :data-testid="`dimension-${dim.key}`"
      >
        {{ dim.score }}
      </a-descriptions-item>
    </a-descriptions>

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
        <a-tag :color="severityTagColor(issue.severity)" class="review-issue__severity">
          {{ issue.severity }}
        </a-tag>
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
      <a-button
        v-for="action in availableActions"
        :key="action.key"
        :data-testid="`action-${action.key}`"
        :type="actionBtnType(action.key)"
        :danger="action.key === 'force_dispute'"
        :disabled="loading"
        size="small"
        @click="handleAction(action.key)"
      >
        {{ action.label }}
      </a-button>
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

	const dimensionScores = computed(() => {
	  const dims = props.reviewResult.dimensions;
	  return dimensions.map((d) => ({
	    ...d,
	    score: (dims[d.key as keyof typeof dims]?.score ?? 0).toFixed(1),
	  }));
	});

const verdictLabels: Record<string, string> = {
  PASS: 'PASS · 通过',
  PASS_WITH_SUGGESTIONS: '通过（有建议）',
  NEEDS_REVISION: '需要修改',
  BLOCKED: '审核不通过',
};

const verdictLabel = computed(() => {
  return verdictLabels[props.reviewResult.verdict] ?? props.reviewResult.verdict;
});

const verdictColor = computed(() => {
  const map: Record<string, string> = {
    PASS: 'success',
    PASS_WITH_SUGGESTIONS: 'warning',
    NEEDS_REVISION: 'error',
    BLOCKED: 'red',
  };
  return map[props.reviewResult.verdict] ?? 'default';
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
    actions.push({ key: 'force_dispute', label: '强制标记争议' });
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

function actionBtnType(key: string): string {
  if (key === 'adopt_suggestions' || key === 'adopt_and_re_review') return 'primary';
  if (key === 'force_dispute') return 'primary';
  return 'default';
}

function severityTagColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'red',
    HIGH: 'volcano',
    MEDIUM: 'orange',
    LOW: 'blue',
  };
  return map[severity] ?? 'default';
}

function handleAction(key: string) {
  const event = key.replace(/_/g, '-') as
    | 'adopt-suggestions'
    | 'ignore-and-confirm'
    | 'adopt-and-re-review'
    | 'manual-edit'
    | 'appeal'
    | 'force-dispute';
  emit(event as any);
}
</script>

<style scoped>
.review-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.review-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.review-panel__score {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.review-panel__dimensions {
  margin-bottom: var(--space-sm);
}

.review-panel__issues {
  margin-bottom: var(--space-md);
  max-height: 200px;
  overflow-y: auto;
}

.review-issue {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.review-issue__severity {
  font-size: 11px;
  white-space: nowrap;
}

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
  padding: var(--space-sm);
  font-size: 13px;
}

.review-panel__actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
</style>
