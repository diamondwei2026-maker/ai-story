<script setup lang="ts">
import { computed } from "vue";

interface Beat {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<{ beats: Beat[] }>();

const totalChapters = computed(() => props.beats.length);

const totalWords = computed(() =>
  props.beats.reduce((sum, b) => sum + b.targetWordCount, 0)
);

const r1Count = computed(() =>
  props.beats.filter((b) => b.useR1).length
);

const climaxCount = computed(() =>
  props.beats.filter((b) => b.isClimax).length
);

const avgHooks = computed(() => {
  if (props.beats.length === 0) return 0;
  const sum = props.beats.reduce((s, b) => s + b.hookCount, 0);
  return Math.round((sum / props.beats.length) * 10) / 10;
});

const staleCount = computed(() =>
  props.beats.filter((b) => b.status === "STALE").length
);

const avgWordCount = computed(() => {
  if (props.beats.length === 0) return 0;
  return Math.round(totalWords.value / props.beats.length);
});

const r1Percent = computed(() => {
  if (props.beats.length === 0) return 0;
  return Math.round((r1Count.value / props.beats.length) * 100);
});

function formatNumber(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n);
}
</script>

<template>
  <a-card
    data-testid="beats-summary-card"
    title="细纲摘要"
    size="small"
    class="beats-summary-card"
  >
    <!-- Empty state -->
    <div
      v-if="beats.length === 0"
      data-testid="summary-empty"
      class="summary-empty"
    >
      暂无细纲数据
    </div>

    <template v-else>
      <!-- Four key metrics -->
      <a-row :gutter="[12, 12]" class="summary-stats">
        <a-col :span="6">
          <div class="stat-item">
            <span
              data-testid="summary-total-chapters"
              class="stat-value"
            >{{ totalChapters }}</span>
            <span class="stat-label">总章节</span>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item">
            <span
              data-testid="summary-total-words"
              class="stat-value"
            >{{ totalWords }}</span>
            <span class="stat-label">总字数</span>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item">
            <span
              data-testid="summary-r1-count"
              class="stat-value stat-value--accent"
            >{{ r1Count }}</span>
            <span class="stat-label">R1 章节</span>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item">
            <span
              data-testid="summary-climax-count"
              class="stat-value stat-value--climax"
            >{{ climaxCount }}</span>
            <span class="stat-label">高潮章</span>
          </div>
        </a-col>
      </a-row>

      <!-- Secondary metrics with progress bars -->
      <div class="summary-details">
        <div class="detail-row">
          <span class="detail-label">平均钩子密度</span>
          <span data-testid="summary-avg-hooks" class="detail-value">{{ avgHooks }}</span>
          <div
            class="detail-bar"
            :style="{ width: `${Math.min((avgHooks / 5) * 100, 100)}%` }"
          />
        </div>

        <div class="detail-row">
          <span class="detail-label">平均字数</span>
          <span class="detail-value">{{ formatNumber(avgWordCount) }}</span>
          <div
            class="detail-bar"
            :style="{ width: `${Math.min((avgWordCount / 5000) * 100, 100)}%` }"
          />
        </div>

        <div class="detail-row">
          <span class="detail-label">R1 占比</span>
          <span class="detail-value">{{ r1Percent }}%</span>
          <div
            class="detail-bar detail-bar--accent"
            :style="{ width: `${r1Percent}%` }"
          />
        </div>

        <div class="detail-row">
          <span class="detail-label">待更新章节</span>
          <span
            data-testid="summary-stale-count"
            class="detail-value"
            :class="{ 'detail-value--warning': staleCount > 0 }"
          >{{ staleCount }} 章</span>
        </div>
      </div>
    </template>
  </a-card>
</template>

<style scoped>
.beats-summary-card {
  margin-bottom: var(--space-md);
}

.summary-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-md);
  font-size: 13px;
}

.summary-stats {
  margin-bottom: var(--space-sm);
}

.stat-item {
  text-align: center;
  padding: var(--space-sm) var(--space-xs);
  background: var(--color-surface-warm);
  border-radius: var(--radius-md);
}

.stat-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.stat-value--accent {
  color: var(--color-primary);
}

.stat-value--climax {
  color: var(--color-accent);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: var(--space-sm);
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  position: relative;
  background: var(--color-surface-warm);
  border-radius: var(--radius-sm);
  padding: 6px var(--space-sm);
  overflow: hidden;
}

.detail-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 50px;
  z-index: 1;
}

.detail-value--warning {
  color: var(--color-error);
}

.detail-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border-radius: var(--radius-sm);
  transition: width 0.4s ease;
  z-index: 0;
}

.detail-bar--accent {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
}
</style>
