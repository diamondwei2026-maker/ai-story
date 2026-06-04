<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import * as echarts from "echarts";

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

const chartContainer = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

function buildOption(beats: Beat[]): echarts.EChartsOption {
  const chapters = beats.map((b) => `第${b.chapterNumber}章`);
  const hookData = beats.map((b) => b.hookCount);
  const wordData = beats.map((b) => b.targetWordCount);
  const climaxIndices = beats
    .map((b, i) => (b.isClimax ? i : -1))
    .filter((i) => i >= 0);

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    legend: {
      data: ["钩子密度", "目标字数", "高潮章节"],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: 48,
      right: 48,
      top: 16,
      bottom: 36,
    },
    xAxis: {
      type: "category",
      data: chapters,
      axisLabel: { fontSize: 10, rotate: chapters.length > 8 ? 45 : 0 },
    },
    yAxis: [
      {
        type: "value",
        name: "钩子数",
        min: 0,
        max: Math.max(...hookData, 5) + 1,
        axisLabel: { fontSize: 10 },
      },
      {
        type: "value",
        name: "字数",
        min: 0,
        axisLabel: { fontSize: 10, formatter: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v) },
      },
    ],
    series: [
      {
        name: "钩子密度",
        type: "line",
        data: hookData,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { color: "#0d9488", width: 2 },
        itemStyle: { color: "#0d9488" },
        markLine: {
          silent: true,
          data: [{ yAxis: 3, label: { formatter: "R1阈值" }, lineStyle: { color: "#f59e0b", type: "dashed" } }],
        },
        markPoint: {
          data: climaxIndices.map((i) => ({
            name: "高潮",
            coord: [i, hookData[i]],
            symbol: "pin",
            symbolSize: 32,
            itemStyle: { color: "#f59e0b" },
          })),
        },
      },
      {
        name: "目标字数",
        type: "bar",
        yAxisIndex: 1,
        data: wordData,
        barWidth: "40%",
        itemStyle: {
          color: (params: any) => {
            const beat = beats[params.dataIndex];
            return beat?.useR1 ? "#0d9488" : "#cbd5e1";
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}

function initChart() {
  if (!chartContainer.value || props.beats.length === 0) return;

  try {
    if (!chartInstance) {
      chartInstance = echarts.init(chartContainer.value);
    }
    chartInstance.setOption(buildOption(props.beats), true);
  } catch {
    // Chart init may fail in test environments without full DOM/Canvas support
    chartInstance = null;
  }
}

function disposeChart() {
  if (chartInstance) {
    try {
      chartInstance.dispose();
    } catch {
      // Ignore disposal errors
    }
    chartInstance = null;
  }
}

onMounted(() => {
  nextTick(() => initChart());
});

watch(
  () => props.beats,
  () => {
    nextTick(() => {
      if (props.beats.length === 0) {
        disposeChart();
      } else if (chartInstance) {
        chartInstance.setOption(buildOption(props.beats), true);
      } else {
        initChart();
      }
    });
  },
  { deep: true },
);

onUnmounted(() => {
  disposeChart();
});
</script>

<template>
  <a-card
    data-testid="beats-rhythm-chart"
    title="叙事节奏曲线"
    size="small"
    class="beats-rhythm-chart"
  >
    <div
      v-if="beats.length === 0"
      data-testid="rhythm-chart-empty"
      class="chart-empty"
    >
      暂无细纲数据
    </div>
    <div
      v-else
      ref="chartContainer"
      data-testid="rhythm-chart-canvas"
      class="chart-canvas"
    />
  </a-card>
</template>

<style scoped>
.beats-rhythm-chart {
  margin-bottom: var(--space-md);
}

.chart-canvas {
  width: 100%;
  height: 320px;
}

.chart-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-lg);
  font-size: 13px;
}
</style>
