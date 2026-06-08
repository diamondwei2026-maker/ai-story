<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import type { Beat } from '@/stores/useBeatStore';
import { useRhythmScore } from '@/composables/useRhythmScore';
import RhythmHelpDrawer from '@/components/RhythmHelpDrawer.vue';

const props = defineProps<{ beats: Beat[] }>();
const emit = defineEmits<{
  'batch-optimize': [startChapter: number, endChapter: number, description: string];
}>();

const chartContainer = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// ── 节奏评分 ──
const beatsRef = computed(() => props.beats);
const { score: rhythmScore } = useRhythmScore(beatsRef);

// ── 帮助面板 ──
const showHelp = ref(false);

// ── 工具函数：数值 → 大白话标签 ──
function intensityLabel(v: number): string {
  if (v >= 4) return '激烈';
  if (v >= 3) return '适中';
  return '偏低';
}
function expectationLabel(v: number): string {
  if (v >= 4) return '强';
  if (v >= 3) return '适中';
  return '偏低';
}

// ── ECharts option（含背景色带 + 警戒线 + 大白话 tooltip） ──
function buildOption(beats: Beat[]): echarts.EChartsOption {
  const chapters = beats.map(b => '第' + b.chapterNumber + '章');
  const intensityData = beats.map(b => b.conflictIntensity);
  const expectationData = beats.map(b => b.readerExpectation);
  const climaxIndices = beats.map((b, i) => b.isClimax ? i : -1).filter(i => i >= 0);

  if (beats.length === 0) return {};

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        let html = '';
        for (const p of params) {
          if (p.seriesName === '冲突强度') {
            html += p.marker + ' 冲突强度: <b>' + p.value + '/5</b>（' + intensityLabel(p.value) + '）<br/>';
          } else if (p.seriesName === '读者期待值') {
            html += p.marker + ' 读者期待值: <b>' + p.value + '/5</b>（' + expectationLabel(p.value) + '）<br/>';
          }
        }
        const chapterName = (params[0] as any)?.axisValue ?? '';
        html += '<span style="color:#9ca3af;font-size:11px">' + chapterName + '</span>';
        return html;
      },
    },
    legend: {
      data: ['冲突强度', '读者期待值', '高潮'],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 48, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: chapters,
      axisLabel: { fontSize: 10, rotate: chapters.length > 8 ? 45 : 0 },
    },
    yAxis: {
      type: 'value',
      name: '强度/期待值',
      min: 0,
      max: 5,
      interval: 1,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: '冲突强度',
        type: 'line',
        data: intensityData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        markPoint: {
          data: climaxIndices.map(i => ({
            name: '高潮',
            coord: [i, intensityData[i]],
            symbol: 'pin',
            symbolSize: 32,
            itemStyle: { color: '#f59e0b' },
          })),
        },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 3, itemStyle: { color: 'rgba(22,163,74,0.06)' } },
              { yAxis: 5 },
            ],
            [
              { yAxis: 2, itemStyle: { color: 'rgba(217,119,6,0.06)' } },
              { yAxis: 3 },
            ],
            [
              { yAxis: 0, itemStyle: { color: 'rgba(220,38,38,0.05)' } },
              { yAxis: 2 },
            ],
          ],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 2.5,
              label: { formatter: '警戒线', fontSize: 10, color: '#9ca3af' },
              lineStyle: { color: '#9ca3af', type: 'dashed', width: 1 },
            },
          ],
        },
      },
      {
        name: '读者期待值',
        type: 'line',
        data: expectationData,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: { color: '#0d9488', width: 2, type: 'dashed' },
        itemStyle: { color: '#0d9488' },
      },
    ],
  };
}

// ── 图表生命周期 ──
function initChart() {
  if (!chartContainer.value || props.beats.length === 0) return;
  try {
    if (!chartInstance) chartInstance = echarts.init(chartContainer.value);
    chartInstance.setOption(buildOption(props.beats), true);
  } catch { chartInstance = null; }
}
function disposeChart() {
  if (chartInstance) {
    try {
      if ((chartInstance as any).getDom?.()?.parentNode) {
        (chartInstance as any).dispose?.();
      }
    } catch { /* ignore */ }
    chartInstance = null;
  }
}
onMounted(() => { nextTick(() => initChart()); });
watch(() => props.beats, () => {
  nextTick(() => {
    if (props.beats.length === 0) { disposeChart(); }
    else if (chartInstance) { chartInstance.setOption(buildOption(props.beats), true); }
    else { initChart(); }
  });
}, { deep: true });
onUnmounted(() => { disposeChart(); });
</script>

<template>
  <div data-testid="beats-rhythm-chart" class="rhythm-chart">
    <!-- ── 总评横幅 ── -->
    <div
      v-if="beats.length > 0"
      data-testid="rhythm-score-banner"
      class="score-banner"
      :style="{ borderLeftColor: rhythmScore.gradeColor }"
    >
      <div class="score-left">
        <span
          class="score-number"
          :style="{ color: rhythmScore.gradeColor }"
        >{{ rhythmScore.score }}</span>
        <span class="score-unit">分</span>
        <span
          class="score-grade"
          :style="{ background: rhythmScore.gradeColor }"
        >{{ rhythmScore.gradeLabel }}</span>
      </div>
      <span class="score-summary">{{ rhythmScore.summaryText }}</span>
    </div>

    <!-- ── 图表标题 + 帮助入口 ── -->
    <div class="chart-header">
      <a-tooltip title="图表阅读指南">
        <a-button
          size="small"
          type="text"
          shape="circle"
          data-testid="rhythm-help-btn"
          @click="showHelp = !showHelp"
        >
          <template #icon><span style="font-weight:700">?</span></template>
        </a-button>
      </a-tooltip>
    </div>

    <!-- ── 帮助抽屉 ── -->
    <RhythmHelpDrawer v-model:open="showHelp" />

    <!-- ── 空状态 ── -->
    <div v-if="beats.length === 0" data-testid="rhythm-chart-empty" class="chart-empty">暂无细纲数据</div>

    <!-- ── 折线图 ── -->
    <template v-else>
      <div ref="chartContainer" data-testid="rhythm-chart-canvas" class="chart-canvas" />

      <!-- ── 预警区间（增强版：含优化建议） ── -->
      <div v-if="rhythmScore.warnings.length > 0" data-testid="rhythm-warnings" class="warnings-area">
        <a-alert
          v-for="(w, idx) in rhythmScore.warnings"
          :key="idx"
          type="warning"
          :message="w.message"
          show-icon
          class="warning-item"
        >
          <template #description>
            <span class="warning-suggestion">{{ w.suggestion }}</span>
          </template>
          <template #action>
            <div class="warning-action">
              <a-button
                size="small"
                type="primary"
                data-testid="rhythm-optimize-btn"
                @click="emit('batch-optimize', w.startChapter, w.endChapter, w.message)"
              >
                一键优化该区间
              </a-button>
              <span class="warning-action-hint">AI 将自动调整该区间内的冲突密度与钩子布局</span>
            </div>
          </template>
        </a-alert>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rhythm-chart {
  /* 由外层 a-collapse-panel 提供边框和背景，此处仅做内部布局 */
}

/* ── 总评横幅 ── */
.score-banner {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  background: var(--color-surface-warm);
  border-radius: var(--radius-md);
  border-left: 4px solid;
  flex-wrap: wrap;
}
.score-left {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
}
.score-number {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.score-unit {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-right: 8px;
}
.score-grade {
  font-size: 12px;
  color: #fff;
  padding: 1px 10px;
  border-radius: 10px;
  font-weight: 600;
  line-height: 1.5;
}
.score-summary {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* ── 图表标题栏 ── */
.chart-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -8px;
  position: relative;
  z-index: 1;
}

/* ── 图表区 ── */
.chart-canvas { width: 100%; height: 300px; }
.chart-empty { text-align: center; color: var(--color-text-secondary); padding: var(--space-lg); font-size: 13px; }

/* ── 预警区 ── */
.warnings-area { margin-top: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.warning-item { margin: 0; }
.warning-suggestion {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.warning-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.warning-action-hint {
  font-size: 11px;
  color: var(--color-text-secondary);
}
</style>
