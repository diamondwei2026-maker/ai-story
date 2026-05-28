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

const severityColors: Record<string, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'blue',
};

const statusColors: Record<string, string> = {
  FIXED: 'success',
  SKIPPED: 'default',
  DEFERRED: 'warning',
};

const statusLabels: Record<string, string> = {
  FIXED: '已修复',
  SKIPPED: '已跳过',
  DEFERRED: '已推迟',
};
</script>

<template>
  <div class="change-analysis-panel" data-testid="change-analysis-panel">
    <div
      v-if="loading"
      data-testid="analysis-loading-indicator"
      class="change-analysis-panel__loading"
    >
      分析中...
    </div>

    <div
      v-if="!loading && isEmpty"
      data-testid="analysis-empty"
      class="change-analysis-panel__empty"
    >
      无受影响的章节
    </div>

    <div
      v-for="group in severityGroups"
      :key="group.severity"
      :data-testid="`severity-group-${group.severity}`"
      class="severity-group"
    >
      <h4 class="severity-group__title">
        <a-tag :color="severityColors[group.severity]">
          {{ severityLabels[group.severity] ?? group.severity }}
        </a-tag>
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
          <a-tag
            v-if="item.status !== 'PENDING'"
            :data-testid="`status-badge-${item.chapterNumber}`"
            :color="statusColors[item.status] ?? 'default'"
            class="severity-group__item-status"
          >
            {{ statusLabels[item.status] ?? item.status }}
          </a-tag>
        </div>

        <div class="severity-group__item-actions">
          <a-button
            :data-testid="`action-apply-fix-${item.chapterNumber}`"
            type="primary"
            size="small"
            :disabled="loading"
            @click="emit('apply-fix', item.chapterNumber)"
          >
            应用修复
          </a-button>
          <a-button
            :data-testid="`action-skip-${item.chapterNumber}`"
            size="small"
            :disabled="loading"
            @click="emit('skip', item.chapterNumber)"
          >
            跳过
          </a-button>
          <a-button
            v-if="item.severity !== 'HIGH'"
            :data-testid="`action-defer-${item.chapterNumber}`"
            size="small"
            :disabled="loading"
            @click="emit('defer', item.chapterNumber)"
          >
            推迟
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.change-analysis-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.change-analysis-panel__loading,
.change-analysis-panel__empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-sm);
  font-size: 13px;
}

.severity-group {
  margin-bottom: var(--space-md);
}

.severity-group__title {
  margin: 0 0 var(--space-sm) 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.severity-group__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.severity-group__item:last-child {
  border-bottom: none;
}

.severity-group__item-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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
  white-space: nowrap;
}

.severity-group__item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
