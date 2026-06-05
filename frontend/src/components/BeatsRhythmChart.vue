<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beats: Beat[] }>();
const emit = defineEmits<{
  'batch-optimize': [startChapter: number, endChapter: number, description: string];
}>();

const chartContainer = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// Detect low-quality intervals
interface QualityWarning {
  startChapter: number;
  endChapter: number;
  message: string;
}
const warnings = computed<QualityWarning[]>(() => {
  const result: QualityWarning[] = [];
  if (props.beats.length < 3) return result;

  let lowStart = -1;
  for (let i = 1; i < props.beats.length - 1; i++) {
    const b = props.beats[i];
    if (b.readerExpectation <= 2 && b.conflictIntensity <= 2) {
      if (lowStart === -1) lowStart = b.chapterNumber;
    } else {
      if (lowStart !== -1) {
        const endChapter = props.beats[i - 1].chapterNumber;
        if (endChapter - lowStart >= 2) {
          result.push({
            startChapter: lowStart,
            endChapter,
            message: '第' + lowStart + '-' + endChapter + '章期待值与冲突强度持续偏低，可能导致读者中途弃书',
          });
        }
        lowStart = -1;
      }
    }
  }
  if (lowStart !== -1) {
    const endChapter = props.beats[props.beats.length - 1].chapterNumber;
    if (endChapter - lowStart >= 2) {
      result.push({ startChapter: lowStart, endChapter, message: '第' + lowStart + '-' + endChapter + '章期待值与冲突强度持续偏低' });
    }
  }

  return result;
});

function handleOptimize(w: QualityWarning) {
  emit('batch-optimize', w.startChapter, w.endChapter, w.message);
}

// Build ECharts option with dual y-axis
function buildOption(beats: Beat[]): echarts.EChartsOption {
  const chapters = beats.map(b => '第' + b.chapterNumber + '章');
  const intensityData = beats.map(b => b.conflictIntensity);
  const expectationData = beats.map(b => b.readerExpectation);
  const climaxIndices = beats.map((b, i) => b.isClimax ? i : -1).filter(i => i >= 0);

  if (beats.length === 0) return {};

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['冲突强度', '读者期待值', '高潮'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 48, right: 48, top: 16, bottom: 36 },
    xAxis: {
      type: 'category', data: chapters,
      axisLabel: { fontSize: 10, rotate: chapters.length > 8 ? 45 : 0 },
    },
    yAxis: {
      type: 'value', name: '强度/期待值',
      min: 0, max: 5,
      interval: 1,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: '冲突强度',
        type: 'line',
        data: intensityData,
        smooth: true,
        symbol: 'circle', symbolSize: 8,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        markPoint: {
          data: climaxIndices.map(i => ({
            name: '高潮', coord: [i, intensityData[i]],
            symbol: 'pin', symbolSize: 32, itemStyle: { color: '#f59e0b' },
          })),
        },
      },
      {
        name: '读者期待值',
        type: 'line',
        data: expectationData,
        smooth: true,
        symbol: 'diamond', symbolSize: 8,
        lineStyle: { color: '#0d9488', width: 2, type: 'dashed' },
        itemStyle: { color: '#0d9488' },
      },
    ],
  };
}

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
      // Guard: prevent dispose errors in jsdom where canvas may be null
      if (chartInstance.getDom() && chartInstance.getDom().parentNode) {
        chartInstance.dispose();
      }
    } catch {
      // Ignore dispose errors (common in test environments without canvas)
    }
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
  <a-card data-testid="beats-rhythm-chart" title="叙事节奏诊断" size="small" class="rhythm-chart">
    <div v-if="beats.length === 0" data-testid="rhythm-chart-empty" class="chart-empty">暂无细纲数据</div>
    <template v-else>
      <div ref="chartContainer" data-testid="rhythm-chart-canvas" class="chart-canvas" />
      <!-- Quality warnings -->
      <div v-if="warnings.length > 0" data-testid="rhythm-warnings" class="warnings-area">
        <a-alert
          v-for="(w, idx) in warnings"
          :key="idx"
          type="warning"
          :message="w.message"
          show-icon
          class="warning-item"
        >
          <template #action>
            <a-button
              size="small"
              type="primary"
              data-testid="rhythm-optimize-btn"
              @click="handleOptimize(w)"
            >
              一键优化该区间
            </a-button>
          </template>
        </a-alert>
      </div>
    </template>
  </a-card>
</template>

<style scoped>
.rhythm-chart { margin-bottom: var(--space-md); }
.chart-canvas { width: 100%; height: 300px; }
.chart-empty { text-align: center; color: var(--color-text-secondary); padding: var(--space-lg); font-size: 13px; }
.warnings-area { margin-top: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.warning-item { margin: 0; }
</style>
