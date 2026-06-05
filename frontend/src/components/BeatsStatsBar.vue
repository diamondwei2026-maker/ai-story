<script setup lang="ts">
import { computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beats: Beat[] }>();

const totalChapters = computed(() => props.beats.length);
const totalWords = computed(() => props.beats.reduce((s, b) => s + b.targetWordCount, 0));
const climaxCount = computed(() => props.beats.filter(b => b.isClimax).length);

const dominantPacing = computed(() => {
  if (props.beats.length === 0) return '暂无';
  const counts = { '快': 0, '中': 0, '慢': 0 };
  for (const b of props.beats) {
    if (b.pacingLabel === '快' || b.pacingLabel === '中' || b.pacingLabel === '慢') counts[b.pacingLabel]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
});

const pacingColor = computed(() => {
  switch (dominantPacing.value) { case '快': return 'red'; case '中': return 'orange'; case '慢': return 'green'; default: return 'default'; }
});

function fmtWordCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}
</script>

<template>
  <div data-testid="beats-stats-bar" class="stats-bar">
    <span class="stat-item">
      <span data-testid="stats-total-chapters" class="stat-value">{{ totalChapters }}</span>
      <span class="stat-label">章</span>
    </span>
    <span class="stat-divider">·</span>
    <span class="stat-item">
      <span data-testid="stats-total-words" class="stat-value">{{ fmtWordCount(totalWords) }}</span>
      <span class="stat-label">字</span>
    </span>
    <span class="stat-divider">·</span>
    <span class="stat-item">
      <span data-testid="stats-climax-count" class="stat-value">{{ climaxCount }}</span>
      <span class="stat-label">高潮章</span>
    </span>
    <span class="stat-divider">·</span>
    <span class="stat-item">
      <span class="stat-label">主导节奏</span>
      <a-tag data-testid="stats-dominant-pacing" :color="pacingColor" size="small">{{ dominantPacing }}</a-tag>
    </span>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface-warm);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.stat-divider {
  color: var(--color-border);
  font-size: 14px;
  user-select: none;
}
</style>
