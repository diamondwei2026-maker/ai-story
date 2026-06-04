<template>
  <div data-testid="beats-view" class="beats-view">
    <h2 data-testid="beats-title" class="beats-view__title section-title">细纲拆解</h2>

    <!-- Loading -->
    <div v-if="loading" data-testid="beats-loading" class="beats-view__loading">
      <a-spin tip="细纲生成中，请稍候..." />
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="beats-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="beats-view__error"
    >
      <template #action>
        <a-button
          data-testid="beats-retry-btn"
          size="small"
          @click="handleGenerate"
        >
          重试
        </a-button>
      </template>
    </a-alert>

    <!-- No beats and initial load done -->
    <EmptyState
      v-if="!beats.length && !loading && initialLoadDone && !error"
      description="细纲尚未生成"
    />

    <!-- Beats content -->
    <template v-if="beats.length && !loading">
      <!-- Config Panel (only when not confirmed) -->
      <BeatsConfigPanel
        v-if="!isConfirmed"
        :default-word-count="defaultWordCount"
        :chapter-count="beats.length"
        :is-confirmed="isConfirmed"
        @update:word-count="handleConfigWordCount"
        @regenerate="handleGenerate"
      />

      <!-- Summary Card -->
      <BeatsSummaryCard :beats="beats" />

      <!-- Rhythm Chart (ECharts) -->
      <div data-testid="beats-rhythm-chart-wrapper" class="beats-view__chart">
        <BeatsRhythmChart :beats="beats" />
      </div>

      <!-- Hook Density Chart -->
      <div data-testid="hook-density-chart" class="beats-view__chart">
        <HookDensityChart :beats="beats" />
      </div>

      <div class="beats-view__layout">
        <BeatList
          :beats="beats"
          :selected-id="selectedBeat?.id"
          @select="handleSelectBeat"
        />

        <div class="beats-view__detail">
          <BeatChapterCard
            v-if="selectedBeat"
            :beat="selectedBeat"
            :selected="true"
          />
          <BeatEditor
            v-if="selectedBeat"
            :beat="selectedBeat"
            @save-wordcount="handleSaveWordCount"
            @save-structure="handleSaveStructure"
          />
          <EmptyState
            v-else
            description="点击左侧章节查看详情"
          />
        </div>
      </div>

      <div
        v-if="!isConfirmed"
        class="beats-view__actions"
      >
        <a-button
          danger
          data-testid="reject-beats-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </a-button>
        <a-button
          type="primary"
          data-testid="confirm-beats-btn"
          class="amber-btn"
          @click="handleConfirm"
        >
          确认细纲，进入正文迭代
        </a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useBeatStore } from '@/stores/useBeatStore';
import type { Beat } from '@/stores/useBeatStore';
import {
  getBeats,
  generateBeats,
  confirmBeats,
  updateBeatWordCount,
  updateBeatStructure,
} from '@/api/beats';
import { getOutline } from '@/api/outline';
import { getProject } from '@/api/project';
import type { BeatDataResponse } from '@/api/beats';
import BeatList from '@/components/BeatList.vue';
import BeatEditor from '@/components/BeatEditor.vue';
import BeatChapterCard from '@/components/BeatChapterCard.vue';
import HookDensityChart from '@/components/HookDensityChart.vue';
import BeatsSummaryCard from '@/components/BeatsSummaryCard.vue';
import BeatsRhythmChart from '@/components/BeatsRhythmChart.vue';
import BeatsConfigPanel from '@/components/BeatsConfigPanel.vue';
import EmptyState from '@/components/EmptyState.vue';

const props = defineProps<{
  projectId: string;
}>();

const store = useWorkflowStore();
const beatStore = useBeatStore();

// Fetch outline text and project config for AI generation
const outlineText = ref('');
const defaultWordCount = ref(3000);

onMounted(async () => {
  try {
    const outline = await getOutline(props.projectId);
    if (outline?.output) {
      outlineText.value = outline.output;
    }
  } catch {
    // silently ignore — best effort
  }
  try {
    const project = await getProject(props.projectId);
    const configWordCount = (project?.config as any)?.defaultChapterWordCount;
    if (typeof configWordCount === 'number' && configWordCount > 0) {
      defaultWordCount.value = configWordCount;
    }
  } catch {
    // silently ignore — best effort
  }
});

const {
  data: beatsData,
  loading,
  error,
  isConfirmed,
  initialLoadDone,
  handleGenerate,
  handleConfirm,
  handleReject,
} = usePhaseWorkflow<BeatDataResponse[]>({
  projectId: props.projectId,
  phase: 'BEATS',
  nextPhase: 'DRAFTING',
  getFn: getBeats,
  generateFn: generateBeats,
  confirmFn: confirmBeats,
  generateArgs: () => ({
    outline: outlineText.value,
    currentContent: '',
    defaultWordCount: defaultWordCount.value,
  }),
  previousPhases: [
    { phase: 'OUTLINE', getFn: getOutline as (id: string) => Promise<unknown> },
  ],
  // beats array doesn't have 'status' property — use store instead
  getStatus: () => store.getStepStatus('BEATS'),
});

// Sync beats to beatStore whenever data changes
watch(beatsData, (val) => {
  if (val && val.length > 0) {
    beatStore.setBeats(val);
  }
});

const beats = computed(() => beatsData.value ?? []);

// Auto-generate if no existing beats after initial load
watch(initialLoadDone, (done) => {
  if (done && !loading.value && !beats.value.length) {
    handleGenerate();
  }
});

// ── BeatsConfigPanel ────────────────────────────────────

function handleConfigWordCount(value: number) {
  defaultWordCount.value = value;
}

// ── BeatEditor integration ──────────────────────────────

const selectedBeat = ref<Beat | null>(null);

function handleSelectBeat(beat: Beat) {
  selectedBeat.value = beat;
}

async function handleSaveWordCount(wordCount: number) {
  if (!selectedBeat.value) return;
  try {
    const updated = await updateBeatWordCount(selectedBeat.value.id, wordCount);
    // Update in local data
    const idx = beatsData.value?.findIndex((b) => b.id === updated.id);
    if (idx !== undefined && idx >= 0 && beatsData.value) {
      beatsData.value[idx] = updated;
    }
    selectedBeat.value = { ...selectedBeat.value, targetWordCount: wordCount, status: updated.status };
    beatStore.updateBeatWordCount(updated.id, wordCount);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存字数失败';
  }
}

async function handleSaveStructure(plan: Record<string, unknown>) {
  if (!selectedBeat.value) return;
  try {
    const updated = await updateBeatStructure(selectedBeat.value.id, plan);
    const idx = beatsData.value?.findIndex((b) => b.id === updated.id);
    if (idx !== undefined && idx >= 0 && beatsData.value) {
      beatsData.value[idx] = updated;
    }
    selectedBeat.value = { ...updated };
    beatStore.updateBeatStructure(updated.id, plan);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存结构失败';
  }
}
</script>

<style scoped>
.beats-view {
  padding: var(--space-md) 0;
}

.beats-view__title {
  margin-bottom: var(--space-md);
}

.beats-view__loading {
  text-align: center;
  padding: var(--space-xl);
}

.beats-view__error {
  margin-bottom: var(--space-md);
}

.beats-view__chart {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background-color: var(--color-surface-warm);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.beats-view__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.beats-view__detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.beats-view__actions {
  text-align: center;
  padding: var(--space-lg) 0;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
