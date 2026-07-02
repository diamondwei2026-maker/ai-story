<script setup lang="ts">
import { computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';
import { useRhythmScore } from '@/composables/useRhythmScore';

const props = defineProps<{ beats: Beat[] }>();

const beatsRef = computed(() => props.beats);
const { score: rhythmScore } = useRhythmScore(beatsRef);

const avgIntensity = computed(() => {
  if (props.beats.length === 0) return '0.0';
  const avg = props.beats.reduce((s, b) => s + b.conflictIntensity, 0) / props.beats.length;
  return avg.toFixed(1);
});
const climaxCount = computed(() => props.beats.filter(b => b.isClimax).length);

const hasWarning = computed(() => rhythmScore.value.warnings.length > 0);

function barColor(beat: Beat): string {
  if (beat.isClimax) return '#f43f5e';      // rose-500
  if (beat.conflictIntensity >= 4) return '#f59e0b'; // amber-400
  return '#93c5fd'; // blue-300
}
</script>

<template>
  <div data-testid="beats-rhythm-chart" class="rhythm-chart">
    <!-- Bar chart: conflict intensity curve -->
    <div class="rhythm-chart__bars-section">
      <div class="rhythm-chart__bars-label">冲突强度曲线（共 {{ beats.length }} 章）</div>
      <div class="rhythm-chart__bars">
        <div
          v-for="beat in beats"
          :key="beat.id"
          class="rhythm-chart__bar-col"
          :title="'第' + beat.chapterNumber + '章 强度' + beat.conflictIntensity"
        >
          <div
            class="rhythm-chart__bar"
            :style="{
              height: (beat.conflictIntensity / 5) * 100 + '%',
              background: barColor(beat),
            }"
          />
          <span class="rhythm-chart__bar-label">{{ beat.chapterNumber }}</span>
        </div>
      </div>
    </div>

    <!-- 3-column stat cards -->
    <div class="rhythm-chart__stats">
      <div class="rhythm-stat-card">
        <div class="rhythm-stat-card__label">整体节奏评分</div>
        <div class="rhythm-stat-card__value">{{ rhythmScore.score }}</div>
        <div class="rhythm-stat-card__sub" :style="{ color: rhythmScore.gradeColor }">{{ rhythmScore.gradeLabel }}</div>
      </div>
      <div class="rhythm-stat-card">
        <div class="rhythm-stat-card__label">平均冲突强度</div>
        <div class="rhythm-stat-card__value">{{ avgIntensity }}</div>
        <div class="rhythm-stat-card__sub">满分 5.0</div>
      </div>
      <div class="rhythm-stat-card">
        <div class="rhythm-stat-card__label">高潮章节数</div>
        <div class="rhythm-stat-card__value">{{ climaxCount }}</div>
        <div class="rhythm-stat-card__sub">共 {{ beats.length }} 章</div>
      </div>
    </div>

    <!-- Warning banner -->
    <div v-if="hasWarning" class="rhythm-warning">
      <span class="rhythm-warning__icon">⚠</span>
      <p class="rhythm-warning__text">{{ rhythmScore.warnings[0]?.message || '建议检查冲突强度分布' }}</p>
    </div>
  </div>
</template>

<style scoped>
.rhythm-chart {
  padding-top: 16px;
}

/* ── Bar chart ── */
.rhythm-chart__bars-section { margin-bottom: 16px; }
.rhythm-chart__bars-label {
  font-size: 11px; color: #9ca3af; margin-bottom: 8px;
}
.rhythm-chart__bars {
  display: flex; align-items: flex-end; gap: 2px; height: 64px;
}
.rhythm-chart__bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  height: 100%; justify-content: flex-end;
}
.rhythm-chart__bar {
  width: 100%; border-radius: 2px 2px 0 0; min-height: 4px;
  transition: height .3s ease;
}
.rhythm-chart__bar-label {
  font-size: 9px; color: #9ca3af; line-height: 1;
}

/* ── 3 stat cards ── */
.rhythm-chart__stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin-bottom: 12px;
}
.rhythm-stat-card {
  background: #f9fafb; border-radius: 8px; padding: 12px; text-align: center;
}
.rhythm-stat-card__label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
.rhythm-stat-card__value { font-size: 20px; font-weight: 700; color: #111827; }
.rhythm-stat-card__sub { font-size: 11px; margin-top: 2px; }

/* ── Warning banner ── */
.rhythm-warning {
  display: flex; align-items: flex-start; gap: 8px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 12px;
}
.rhythm-warning__icon { font-size: 14px; color: #f59e0b; flex-shrink: 0; margin-top: 1px; }
.rhythm-warning__text {
  font-size: 12px; color: #b45309; line-height: 1.6; margin: 0;
}
</style>
