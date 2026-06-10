<template>
  <div data-testid="review-panel" class="review-panel">
    <!-- Verdict badge -->
    <div class="review-panel__header">
      <a-tag data-testid="verdict-badge" :color="verdictColor">{{ verdictLabel }}</a-tag>
      <span data-testid="overall-score" class="review-panel__score">
        {{ (reviewResult.overallScore ?? 0).toFixed(1) }} / 10
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

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ReviewIssue, ReviewResult } from '@/types';

const props = withDefaults(defineProps<{
  reviewResult: ReviewResult;
  chapterStatus: string;
  loading?: boolean;
}>(), {
  loading: false,
});

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
	    score: (dims?.[d.key as keyof typeof dims]?.score ?? 0).toFixed(1),
	  }));
	});

const verdictLabels: Record<string, string> = {
  PASS: 'PASS · 通过',
  PASS_WITH_SUGGESTIONS: '通过（有建议）',
  NEEDS_REVISION: '需要修改',
  BLOCKED: '审核不通过',
};

const verdictLabel = computed(() => {
  return verdictLabels[props.reviewResult.verdict] ?? props.reviewResult.verdict ?? '未知';
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
    ...(dims?.POLITICAL_SAFETY?.issues ?? []),
    ...(dims?.SEXUAL_CONTENT?.issues ?? []),
    ...(dims?.VIOLENCE?.issues ?? []),
    ...(dims?.VALUES?.issues ?? []),
  ];
});

function severityTagColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'red',
    HIGH: 'volcano',
    MEDIUM: 'orange',
    LOW: 'blue',
  };
  return map[severity] ?? 'default';
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

</style>
