<script setup lang="ts">
import { computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beats: Beat[] }>();

const maxHooks = computed(() => {
  if (props.beats.length === 0) return 1;
  return Math.max(...props.beats.map((b) => b.hookCount), 1);
});

const threshold = 3;

function barHeight(hookCount: number): string {
  return `${(hookCount / maxHooks.value) * 100}%`;
}
</script>

<template>
  <a-card data-testid="hook-density-chart" title="钩子密度分布" size="small">
    <template #extra>
      <a-tag color="teal">R1 阈值: {{ threshold }}</a-tag>
    </template>

    <div v-if="beats.length === 0" data-testid="hook-density-empty" class="chart-empty">
      暂无数据
    </div>
    <template v-else>
      <div class="chart-area">
        <div data-testid="hook-density-yaxis" class="y-axis">
          <span v-for="n in maxHooks" :key="n" class="y-tick">{{ n }}</span>
        </div>
        <div class="bars-area">
          <div
            v-for="beat in beats"
            :key="beat.id"
            class="bar-col"
          >
            <div
              data-testid="hook-density-bar"
              :class="{
                'bar-high': beat.hookCount >= threshold,
                'bar-normal': beat.hookCount < threshold,
              }"
              :style="{ height: barHeight(beat.hookCount) }"
              :title="`第${beat.chapterNumber}章: ${beat.hookCount} 个钩子`"
            />
            <span
              data-testid="hook-density-label"
              class="bar-label"
            >
              第{{ beat.chapterNumber }}章
            </span>
          </div>
        </div>
      </div>
      <div
        data-testid="hook-density-threshold"
        class="threshold-line"
        :style="{ bottom: barHeight(threshold) }"
      />
    </template>
  </a-card>
</template>

<style scoped>
.chart-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-lg);
  font-size: 13px;
}

.chart-area {
  display: flex;
  height: 200px;
  align-items: flex-end;
  gap: 2px;
  position: relative;
}

.y-axis {
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  height: 100%;
  padding-right: var(--space-sm);
  min-width: 24px;
}

.y-tick {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: right;
}

.bars-area {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
  flex: 1;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar-col > div:first-child {
  width: 100%;
  max-width: 48px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  min-height: 4px;
  transition: height 0.3s;
}

.bar-normal {
  background: var(--color-bg-tertiary);
}

.bar-high {
  background: var(--color-primary);
}

.bar-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  white-space: nowrap;
}

.threshold-line {
  position: absolute;
  left: 40px;
  right: 8px;
  border-top: 1px dashed var(--color-primary);
}
</style>
