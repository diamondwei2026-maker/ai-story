<template>
  <div data-testid="beats-view" class="beats-view">
    <h2 data-testid="beats-title" class="beats-view__title section-title">细纲拆解</h2>

    <!-- CONFIG state: no beats yet -->
    <template v-if="viewState === 'CONFIG'">
      <BeatsConfigPanel
        :default-word-count="configWordCount"
        :is-confirmed="false"
        :outline-text="outlineText"
        @start-generation="handleStartGeneration"
        @update:word-count="(v: number) => configWordCount = v"
      />
    </template>

    <!-- GENERATING state -->
    <div v-if="viewState === 'GENERATING'" data-testid="beats-loading" class="beats-view__loading">
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
        <a-button data-testid="beats-retry-btn" size="small" @click="handleGenerate">重试</a-button>
      </template>
    </a-alert>

    <!-- REVIEWING / CONFIRMED state: show beats -->
    <template v-if="(viewState === 'REVIEWING' || viewState === 'CONFIRMED') && beats.length">
      <!-- Stats Bar -->
      <BeatsStatsBar :beats="beats" />

      <!-- Rhythm Chart (collapsible) -->
      <a-collapse v-model:activeKey="chartCollapsed" :bordered="false" class="beats-view__collapse">
        <a-collapse-panel key="rhythm">
          <template #header>
            <span>叙事节奏诊断</span>
            <template v-if="beats.length > 0">
              <a-tag :color="rhythmScore.gradeColor" size="small" style="margin-left:8px">{{ rhythmScore.score }}分 {{ rhythmScore.gradeLabel }}</a-tag>
              <span v-if="rhythmScore.warnings.length > 0" style="margin-left:4px;font-size:11px;color:#d97706">{{ rhythmScore.warnings.length }}处可优化</span>
            </template>
          </template>
          <BeatsRhythmChart :beats="beats" @batch-optimize="handleBatchOptimize" />
        </a-collapse-panel>
      </a-collapse>

      <!-- Narrative card list -->
      <div class="beats-view__cards">
        <BeatNarrativeCard
          v-for="beat in beats"
          :key="beat.id"
          :beat="beat"
          :is-expanded="expandedBeatId === beat.id"
          :is-affected="adjustState.affectedChapterNumbers.includes(beat.chapterNumber)"
          @toggle-expand="handleToggleExpand"
          @adjust="handleAdjustBeat"
          @save-wordcount="handleSaveWordCount"
          @toggle-climax="handleToggleClimax"
        />
      </div>

      <!-- Adjustment impact warnings -->
      <div v-if="adjustState.warnings.length > 0" class="beats-view__impact">
        <a-alert
          v-for="(w, idx) in adjustState.warnings"
          :key="idx"
          type="info"
          :message="w"
          show-icon
          closable
          class="impact-item"
        />
      </div>

      <!-- Action buttons (REVIEWING only) -->
      <div v-if="viewState === 'REVIEWING'" class="beats-view__actions">
        <a-button
          danger
          data-testid="reject-beats-btn"
          @click="handleReject"
        >
          驳回重新生成
        </a-button>
        <a-button
          type="primary"
          data-testid="confirm-beats-btn"
          class="amber-btn"
          size="large"
          @click="handleConfirm"
        >
          确认细纲，进入正文迭代
        </a-button>
      </div>

      <!-- CONFIRMED indicator -->
      <div v-if="viewState === 'CONFIRMED'" data-testid="beats-confirmed-notice" class="beats-view__confirmed">
        <a-alert type="success" message="细纲已确认，当前为只读模式" show-icon />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import { useBeatStore } from '@/stores/useBeatStore';
import { useBeatsAdjustment } from '@/composables/useBeatsAdjustment';
import { useRhythmScore } from '@/composables/useRhythmScore';
import type { Beat } from '@/stores/useBeatStore';
import {
  getBeats,
  generateBeats,
  confirmBeats,
} from '@/api/beats';
import { getOutline } from '@/api/outline';
import { getSetting } from '@/api/setting';
import { getIdea } from '@/api/idea';
import { getProject } from '@/api/project';
import type { BeatDataResponse } from '@/api/beats';
import BeatNarrativeCard from '@/components/BeatNarrativeCard.vue';
import BeatsStatsBar from '@/components/BeatsStatsBar.vue';
import BeatsRhythmChart from '@/components/BeatsRhythmChart.vue';
import BeatsConfigPanel from '@/components/BeatsConfigPanel.vue';
import EmptyState from '@/components/EmptyState.vue';

const props = defineProps<{ projectId: string }>();
const store = useWorkflowStore();
const beatStore = useBeatStore();

const outlineText = ref('');
const configWordCount = ref(3000);
const configTargetChapters = ref<number | undefined>(undefined);

onMounted(async () => {
  try {
    const outline = await getOutline(props.projectId);
    if (outline?.output) outlineText.value = outline.output;
  } catch {}
  try {
    const project = await getProject(props.projectId);
    const cwc = (project?.config as any)?.defaultChapterWordCount;
    if (typeof cwc === 'number' && cwc > 0) configWordCount.value = cwc;
  } catch {}
});

const {
  data: beatsData,
  loading,
  error,
  isConfirmed,
  handleGenerate: baseHandleGenerate,
  handleConfirm: baseHandleConfirm,
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
    defaultWordCount: configWordCount.value,
    ...(configTargetChapters.value != null ? { targetChapterCount: String(configTargetChapters.value) } : {}),
  }),
  previousPhases: [
    { phase: 'IDEA', getFn: getIdea as (id: string) => Promise<unknown> },
    { phase: 'SETTING', getFn: getSetting as (id: string) => Promise<unknown> },
    { phase: 'OUTLINE', getFn: getOutline as (id: string) => Promise<unknown> },
  ],
  getStatus: (data) => {
    // Derive phase status from actual beat data instead of store (which may be stale)
    //   - If beats exist and all are CONFIRMED → the whole phase is CONFIRMED
    //   - If beats exist but not all confirmed → phase is AWAITING_REVIEW (→ IN_PROGRESS)
    //   - If no beats yet → fall back to store (handles PENDING / initial state)
    if (!data || data.length === 0) return store.getStepStatus('BEATS');
    const allConfirmed = data.every(b => b.status === 'CONFIRMED');
    return allConfirmed ? 'CONFIRMED' : 'AWAITING_REVIEW';
  },
});

// Sync beats to beatStore
watch(beatsData, (val) => {
  if (val && val.length > 0) beatStore.setBeats(val);
});

const beats = computed(() => beatsData.value ?? []);

// ── 节奏评分（供 collapse header 显示） ──
const { score: rhythmScore } = useRhythmScore(beats);

// Collapse 默认行为：有预警时展开
const chartCollapsed = ref<string[]>([]);
watch(rhythmScore, (s) => {
  if (s.warnings.length > 0 && chartCollapsed.value.length === 0) {
    chartCollapsed.value = ['rhythm'];
  }
}, { immediate: true });

// State machine
type ViewState = 'CONFIG' | 'GENERATING' | 'REVIEWING' | 'CONFIRMED';
const viewState = computed<ViewState>(() => {
  if (isConfirmed.value) return 'CONFIRMED';
  if (loading.value) return 'GENERATING';
  if (beats.value.length > 0) return 'REVIEWING';
  return 'CONFIG';
});

// NO auto-generate — user must click "开始拆解" in CONFIG state

// Config panel callback
function handleStartGeneration(opts: { targetChapterCount: number; defaultWordCount: number }) {
  configTargetChapters.value = opts.targetChapterCount;
  configWordCount.value = opts.defaultWordCount;
  baseHandleGenerate();
}

// Accordion for narrative cards
const expandedBeatId = ref<string | null>(null);
function handleToggleExpand(beatId: string) {
  expandedBeatId.value = expandedBeatId.value === beatId ? null : beatId;
}

// Adjustment composable — destructure state ref for template auto-unwrap
const {
  state: adjustState,
  handleAdjustBeat: doAdjustBeat,
  handleBatchAdjust: doBatchAdjust,
  handleWordCountUpdate: doWordCountUpdate,
  handleStructureUpdate: doStructureUpdate,
} = useBeatsAdjustment(props.projectId);

async function handleAdjustBeat(beatId: string, feedback: string) {
  await doAdjustBeat(beatId, feedback);
  // Incremental patch from store — avoid redundant API call
  if (beatsData.value) {
    beatsData.value = beatStore.beats.map(b => ({ ...b, status: b.status }));
  }
}

async function handleBatchOptimize(startChapter: number, endChapter: number, description: string) {
  await doBatchAdjust(startChapter, endChapter, description);
  if (beatsData.value) {
    beatsData.value = beatStore.beats.map(b => ({ ...b, status: b.status }));
  }
}

async function handleSaveWordCount(beatId: string, wordCount: number) {
  await doWordCountUpdate(beatId, wordCount);
  if (!beatsData.value) return;
  const idx = beatsData.value.findIndex(b => b.id === beatId);
  if (idx >= 0) {
    beatsData.value[idx] = { ...beatsData.value[idx], targetWordCount: wordCount, status: 'STALE' as Beat['status'] };
  }
}

async function handleToggleClimax(beatId: string, isClimax: boolean) {
  const beat = beats.value.find(b => b.id === beatId);
  if (!beat) return;
  await doStructureUpdate(beatId, { ...beat.plan, isClimax });
  if (!beatsData.value) return;
  const idx = beatsData.value.findIndex(b => b.id === beatId);
  if (idx >= 0) {
    beatsData.value[idx] = { ...beatsData.value[idx], plan: { ...beatsData.value[idx].plan, isClimax }, isClimax, status: 'STALE' as Beat['status'] };
  }
}

// Confirm/Reject wrappers
async function handleGenerate() {
  configTargetChapters.value = undefined;
  await baseHandleGenerate();
}
async function handleConfirm() { await baseHandleConfirm(); }
</script>

<style scoped>
.beats-view { padding: var(--space-md) 0; }
.beats-view__title { margin-bottom: var(--space-md); }
.beats-view__loading { text-align: center; padding: var(--space-xl); }
.beats-view__error { margin-bottom: var(--space-md); }
.beats-view__collapse { margin-bottom: var(--space-md); }
.beats-view__cards { display: flex; flex-direction: column; gap: 0; }
.beats-view__impact { margin: var(--space-md) 0; display: flex; flex-direction: column; gap: var(--space-sm); }
.impact-item { margin: 0; }
.beats-view__actions { text-align: center; padding: var(--space-lg) 0; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.beats-view__confirmed { text-align: center; padding: var(--space-md) 0; }
</style>
