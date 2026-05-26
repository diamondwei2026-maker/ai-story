<script setup lang="ts">
import { computed } from 'vue';
import type { ChangeAnalysisData, ImpactedChapter } from '@/api/chapter';

const props = withDefaults(defineProps<{
  changeAnalysis: ChangeAnalysisData | null;
  loading?: boolean;
}>(), {
  loading: false,
});

const emit = defineEmits<{
  'apply-fix': [chapterNumber: number];
  'skip': [chapterNumber: number];
  'defer': [chapterNumber: number];
}>();

const severityOrder = ['HIGH', 'MEDIUM', 'LOW'] as const;

const severityGroups = computed(() => {
  if (!props.changeAnalysis) return [];
  const grouped: Record<string, ImpactedChapter[]> = {
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };
  for (const item of props.changeAnalysis.impactedChapters) {
    if (item.severity in grouped) {
      grouped[item.severity].push(item);
    }
  }
  return severityOrder
    .filter((sev) => grouped[sev].length > 0)
    .map((sev) => ({ severity: sev, items: grouped[sev] }));
});

const isEmpty = computed(() => {
  return (
    !props.changeAnalysis ||
    props.changeAnalysis.impactedChapters.length === 0
  );
});

const severityLabels: Record<string, string> = {
  HIGH: '高影响',
  MEDIUM: '中影响',
  LOW: '低影响',
};
</script>

<template>
  <div class="change-analysis-panel" data-testid="change-analysis-panel">
    <!-- Loading indicator -->
    <div
      v-if="loading"
      data-testid="analysis-loading-indicator"
      class="change-analysis-panel__loading"
    >
      分析中...
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && isEmpty"
      data-testid="analysis-empty"
      class="change-analysis-panel__empty"
    >
      无受影响的章节
    </div>

    <!-- Severity groups -->
    <div
      v-for="group in severityGroups"
      :key="group.severity"
      :data-testid="`severity-group-${group.severity}`"
      class="severity-group"
    >
      <h4 class="severity-group__title">
        {{ severityLabels[group.severity] ?? group.severity }}
      </h4>

      <div
        v-for="item in group.items"
        :key="item.chapterNumber"
        class="severity-group__item"
      >
        <div class="severity-group__item-info">
          <span class="severity-group__item-chapter">
            第 {{ item.chapterNumber }} 章
          </span>
          <span class="severity-group__item-reason">{{ item.reason }}</span>
          <span
            v-if="item.status !== 'PENDING'"
            :data-testid="`status-badge-${item.chapterNumber}`"
            class="severity-group__item-status"
            :class="`severity-group__item-status--${item.status.toLowerCase()}`"
          >
            {{ item.status }}
          </span>
        </div>

        <div class="severity-group__item-actions">
          <span data-testid="action-apply-fix">
            <button
              :data-testid="`action-apply-fix-${item.chapterNumber}`"
              class="change-analysis-panel__btn change-analysis-panel__btn--primary"
              :disabled="loading"
              @click="emit('apply-fix', item.chapterNumber)"
            >
              应用修复
            </button>
          </span>
          <span data-testid="action-skip">
            <button
              :data-testid="`action-skip-${item.chapterNumber}`"
              class="change-analysis-panel__btn"
              :disabled="loading"
              @click="emit('skip', item.chapterNumber)"
            >
              跳过
            </button>
          </span>
          <span
            v-if="item.severity !== 'HIGH'"
            data-testid="action-defer"
          >
            <button
              :data-testid="`action-defer-${item.chapterNumber}`"
              class="change-analysis-panel__btn"
              :disabled="loading"
              @click="emit('defer', item.chapterNumber)"
            >
              推迟
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('@/styles/css-variables.css');

.change-analysis-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.change-analysis-panel__loading,
.change-analysis-panel__empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 12px;
  font-size: 13px;
}

.severity-group {
  margin-bottom: 16px;
}

.severity-group__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.severity-group__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.severity-group__item:last-child {
  border-bottom: none;
}

.severity-group__item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.severity-group__item-chapter {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.severity-group__item-reason {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.severity-group__item-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.severity-group__item-status--fixed {
  background: #e6f7e6;
  color: #2d7d2d;
}

.severity-group__item-status--skipped {
  background: #f0f0f0;
  color: #666;
}

.severity-group__item-status--deferred {
  background: #fff4e6;
  color: #b8860b;
}

.severity-group__item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.change-analysis-panel__btn {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  color: var(--color-text-primary);
  transition: background-color 0.2s;
}

.change-analysis-panel__btn:hover:not(:disabled) {
  background: var(--color-bg);
}

.change-analysis-panel__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.change-analysis-panel__btn--primary {
  background: var(--color-gold);
  color: #fff;
  border-color: var(--color-gold);
}

.change-analysis-panel__btn--primary:hover:not(:disabled) {
  background: var(--color-gold-dark);
}
</style>
