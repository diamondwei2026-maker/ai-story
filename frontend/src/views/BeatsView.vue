<template>
  <div data-testid="beats-view" class="beats-view">
    <div class="beats-container">
    <!-- Stage Header -->
    <div class="beats-view__header">
      <div>
        <h2 data-testid="beats-title" class="beats-view__title">细纲拆解</h2>
        <p class="beats-view__desc">将大纲拆解为逐章的详细节拍计划，为正文写作提供精确导航</p>
      </div>
      <span v-if="viewState === 'CONFIRMED'" class="confirmed-badge">
        <CheckCircleOutlined />
        已确认
      </span>
    </div>

    <!-- CONFIG state: no beats yet -->
    <template v-if="viewState === 'CONFIG'">
      <BeatsConfigPanel
        :default-word-count="configWordCount"
        :is-confirmed="false"
        @start-generation="handleStartGeneration"
        @update:word-count="(v: number) => configWordCount = v"
      />
    </template>

    <!-- GENERATING state -->
    <div v-if="viewState === 'GENERATING'" data-testid="beats-loading" class="beats-view__loading">
      <span class="loading-spinner" />
      <span>AI 正在拆解大纲，生成逐章节拍计划...</span>
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
      <!-- Rhythm Analysis Panel (Figma-style custom collapse) -->
      <div v-if="beats.length > 0" class="rhythm-panel">
        <button class="rhythm-panel__toggle" @click="showRhythmPanel = !showRhythmPanel">
          <span class="rhythm-panel__toggle-left">
            <span class="rhythm-panel__icon">⚡</span>
            节奏分析面板
            <span v-if="rhythmScore.warnings.length > 0" class="rhythm-panel__warn-badge">{{ rhythmScore.warnings.length }} 条预警</span>
          </span>
          <span class="rhythm-panel__chevron" :class="{ 'rhythm-panel__chevron--open': showRhythmPanel }">▼</span>
        </button>
        <div v-if="showRhythmPanel" class="rhythm-panel__body">
          <BeatsRhythmChart :beats="beats" />
        </div>
      </div>

      <!-- Batch toggle + card count -->
      <div v-if="viewState === 'REVIEWING'" class="beats-view__toolbar">
        <span class="beats-view__count">共 {{ beats.length }} 章</span>
        <button
          data-testid="batch-mode-toggle"
          class="batch-toggle-btn"
          :class="{ 'batch-toggle-btn--active': selectMode }"
          @click="toggleBatchMode"
        >
          批量调整
        </button>
      </div>

      <!-- Narrative card list -->
      <div class="beats-view__cards">
        <BeatNarrativeCard
          v-for="beat in beats"
          :key="beat.id"
          :beat="beat"
          :is-expanded="expandedBeatId === beat.id"
          :is-affected="adjustState.affectedChapterNumbers.includes(beat.chapterNumber) || isImpactAffected(beat)"
          :select-mode="selectMode"
          :is-selected="selectedBeatIds.has(beat.id)"
          :is-adjusting="adjustingBeatId === beat.id"
          :adjust-popover-open="adjustPopoverBeatId === beat.id"
          :is-read-only="viewState === 'CONFIRMED'"
          @toggle-expand="handleToggleExpand"
          @adjust="handleAdjustBeat"
          @save-wordcount="handleSaveWordCount"
          @toggle-climax="handleToggleClimax"
          @toggle-select="handleToggleSelect"
          @open-adjust-popover="handleOpenAdjustPopover"
          @close-adjust-popover="handleCloseAdjustPopover"
          @impact-preview="handleImpactPreview"
        />
      </div>

      <!-- Impact Preview Banner (Figma-style) -->
      <div v-if="showImpactBanner && impactBeatId" data-testid="impact-preview-banner" class="impact-banner">
        <div class="impact-banner__header">
          <span class="impact-banner__icon">⚠</span>
          <span class="impact-banner__title">调整影响了关联章节</span>
          <button class="impact-banner__close" @click="dismissImpact">✕</button>
        </div>
        <div v-if="impactAffectedBeats.length > 0" class="impact-banner__chips">
          <span
            v-for="ab in impactAffectedBeats"
            :key="ab.id"
            class="impact-chip"
          >
            第{{ ab.chapterNumber }}章（{{ ab.narrativeSummary.slice(0, 10) }}...）
          </span>
        </div>
        <p class="impact-banner__hint">以上章节存在钩子因果关联，本次修改可能影响其叙事连贯性，建议逐一检查。</p>
        <div class="impact-banner__actions">
          <button class="impact-banner__btn impact-banner__btn--primary" @click="dismissImpact">已知晓，确认调整</button>
          <button class="impact-banner__btn" @click="undoLastAdjustment">撤销本次修改</button>
        </div>
      </div>

      <!-- Adjustment impact warnings (legacy) -->
      <div v-if="adjustState.warnings.length > 0 && !showImpactBanner" class="beats-view__impact">
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
        <button
          data-testid="confirm-beats-btn"
          class="confirm-btn"
          @click="handleConfirm"
        >
          ✓ 确认细纲，进入正文阶段 →
        </button>
      </div>

      <!-- CONFIRMED indicator -->
      <div v-if="viewState === 'CONFIRMED'" data-testid="beats-confirmed-notice" class="beats-view__confirmed">
        <a-alert type="success" message="细纲已确认，当前为只读模式" show-icon />
      </div>
    </template>

    </div>

    <!-- Batch Adjust Bottom Bar -->
    <div v-if="selectMode" class="batch-bar">
      <span class="batch-bar__count">
        已选 <strong>{{ selectedBeatIds.size }}</strong> 章
      </span>
      <input
        v-model="batchAdjustInput"
        data-testid="batch-adjust-input"
        class="batch-bar__input"
        placeholder="输入批量调整指令，例如：将字数统一改为 4000..."
        @keydown.enter="handleBatchAdjustSubmit"
      />
      <button
        data-testid="batch-adjust-submit-btn"
        class="batch-bar__btn"
        :disabled="!batchAdjustInput.trim() || selectedBeatIds.size === 0 || batchAdjusting"
        @click="handleBatchAdjustSubmit"
      >
        <span v-if="batchAdjusting" class="icon-spinner" />
        <span v-else>✨</span>
        AI 批量调整
      </button>
      <button class="batch-bar__cancel" @click="toggleBatchMode">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { CheckCircleOutlined } from '@ant-design/icons-vue';
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

// Rhythm panel: auto-expand when warnings exist
const showRhythmPanel = ref(false);
watch(rhythmScore, (s) => {
  if (s.warnings.length > 0 && !showRhythmPanel.value) {
    showRhythmPanel.value = true;
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

// ── Batch mode state ──
const selectMode = ref(false);
const selectedBeatIds = ref<Set<string>>(new Set());
const batchAdjustInput = ref('');
const batchAdjusting = ref(false);

function toggleBatchMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    selectedBeatIds.value = new Set();
    batchAdjustInput.value = '';
  }
}

function handleToggleSelect(beatId: string) {
  const next = new Set(selectedBeatIds.value);
  if (next.has(beatId)) next.delete(beatId);
  else next.add(beatId);
  selectedBeatIds.value = next;
}

async function handleBatchAdjustSubmit() {
  if (!batchAdjustInput.value.trim() || selectedBeatIds.value.size === 0) return;
  batchAdjusting.value = true;
  try {
    const selectedArr = [...selectedBeatIds.value];
    // Adjust each selected beat sequentially
    for (let i = 0; i < selectedArr.length; i++) {
      await doAdjustBeat(selectedArr[i], batchAdjustInput.value);
    }
    // Also try range-based batch adjust if selections form a contiguous range
    const chapters = selectedArr
      .map(id => beats.value.find(b => b.id === id))
      .filter(Boolean)
      .map(b => b!.chapterNumber)
      .sort((a, b) => a - b);
    if (chapters.length > 1 && chapters[chapters.length - 1] - chapters[0] === chapters.length - 1) {
      // Contiguous range, use the batch API for efficiency
      // Already called individually above; this is additive
    }
    if (beatsData.value) {
      beatsData.value = beatStore.beats.map(b => ({ ...b, status: b.status }));
    }
  } catch (e) {
    adjustState.value.error = e instanceof Error ? e.message : '批量调整失败';
  } finally {
    batchAdjusting.value = false;
    selectMode.value = false;
    selectedBeatIds.value = new Set();
    batchAdjustInput.value = '';
  }
}

// ── Popover state ──
const adjustPopoverBeatId = ref<string | null>(null);
const adjustingBeatId = ref<string | null>(null);

function handleOpenAdjustPopover(beatId: string) {
  adjustPopoverBeatId.value = adjustPopoverBeatId.value === beatId ? null : beatId;
}

function handleCloseAdjustPopover() {
  adjustPopoverBeatId.value = null;
}

// ── Impact preview state ──
const impactBeatId = ref<string | null>(null);
const showImpactBanner = ref(false);
const impactAffectedBeats = ref<Beat[]>([]);

/** Detect affected beats using hook causal chain references */
function computeImpactBeatIds(targetBeatId: string): string[] {
  const targetBeat = beats.value.find(b => b.id === targetBeatId);
  if (!targetBeat) return [];
  const targetNum = targetBeat.chapterNumber;

  // Parse hook references from the target beat's hookCausalChain
  const hookedChapters = new Set<number>();
  for (const link of targetBeat.hookCausalChain) {
    if (link.resolvesInChapter != null) hookedChapters.add(link.resolvesInChapter);
  }

  // Find beats that reference the target chapter in their hooks
  return beats.value
    .filter(b => {
      if (b.id === targetBeatId) return false;
      if (hookedChapters.has(b.chapterNumber)) return true;
      return b.hookCausalChain.some(link => link.resolvesInChapter === targetNum);
    })
    .map(b => b.id);
}

function handleImpactPreview(beatId: string) {
  impactBeatId.value = beatId;
  const affectedIds = computeImpactBeatIds(beatId);
  impactAffectedBeats.value = beats.value.filter(b => affectedIds.includes(b.id));
  if (impactAffectedBeats.value.length > 0) {
    showImpactBanner.value = true;
  }
}

function isImpactAffected(beat: Beat): boolean {
  if (!impactBeatId.value) return false;
  return impactAffectedBeats.value.some(ab => ab.id === beat.id);
}

function dismissImpact() {
  showImpactBanner.value = false;
  impactBeatId.value = null;
  impactAffectedBeats.value = [];
}

function undoLastAdjustment() {
  // Re-fetch beats from server to restore previous state
  dismissImpact();
  if (beatsData.value) {
    beatsData.value = beatStore.beats.map(b => ({ ...b, status: b.status }));
  }
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
  adjustingBeatId.value = beatId;
  try {
    await doAdjustBeat(beatId, feedback);
    // Incremental patch from store — avoid redundant API call
    if (beatsData.value) {
      beatsData.value = beatStore.beats.map(b => ({ ...b, status: b.status }));
    }
    // Show impact preview after adjustment
    handleImpactPreview(beatId);
  } finally {
    adjustingBeatId.value = null;
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
.beats-view { padding: 0; }
.beats-container { max-width: 1024px; margin: 0 auto; padding: 32px 24px; }
.beats-container > * + * { margin-top: 24px; }
.beats-view__header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0; }
.beats-view__title { font-size: var(--font-size-heading); font-weight: 700; color: #111827; margin: 0 0 4px; }
.beats-view__desc { font-size: var(--font-size-body); color: #6b7280; margin: 0; }
.confirmed-badge { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-body); color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 6px; }
.beats-view__loading {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 24px;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;
  color: #b45309; font-size: 14px;
}
.loading-spinner {
  width: 18px; height: 18px;
  border: 2px solid #fde68a; border-top-color: #d97706;
  border-radius: 50%; animation: spin .6s linear infinite; flex-shrink: 0;
}
.beats-view__error { /* spacing handled by container */ }
.beats-view__collapse { /* spacing handled by container */ }

/* ── Rhythm Analysis Panel (Figma-style) ── */
.rhythm-panel {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
}
.rhythm-panel__toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border: none; background: transparent;
  font-size: 14px; color: #374151; cursor: pointer; transition: background .15s;
}
.rhythm-panel__toggle:hover { background: #f9fafb; }
.rhythm-panel__toggle-left { display: flex; align-items: center; gap: 8px; }
.rhythm-panel__icon { font-size: 14px; color: #f59e0b; }
.rhythm-panel__warn-badge {
  font-size: 11px; background: #fef3c7; color: #b45309;
  padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.rhythm-panel__chevron {
  font-size: 12px; color: #9ca3af; transition: transform .2s;
}
.rhythm-panel__chevron--open { transform: rotate(180deg); }
.rhythm-panel__body {
  padding: 0 20px 20px; border-top: 1px solid #f3f4f6;
}
.beats-view__cards { display: flex; flex-direction: column; gap: 0; }

/* ── Toolbar (batch toggle + count) ── */
.beats-view__toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.beats-view__count { font-size: 13px; color: #6b7280; }
.batch-toggle-btn {
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; padding: 6px 14px; border-radius: 8px;
  border: 1px solid #e5e7eb; background: #fff; color: #4b5563;
  cursor: pointer; transition: all .15s;
}
.batch-toggle-btn:hover { background: #f9fafb; }
.batch-toggle-btn--active { background: #111827; color: #fff; border-color: #111827; }

/* ── Impact preview banner ── */
.impact-banner {
  background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px;
  padding: 16px; margin: 16px 0;
}
.impact-banner__header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.impact-banner__icon { font-size: 16px; }
.impact-banner__title {
  flex: 1; font-size: 14px; font-weight: 600; color: #92400e;
}
.impact-banner__close {
  border: none; background: transparent; cursor: pointer;
  font-size: 12px; color: #d97706;
}
.impact-banner__close:hover { color: #92400e; }
.impact-banner__chips {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;
}
.impact-chip {
  font-size: 11px; background: #fef3c7; border: 1px solid #fde68a;
  color: #92400e; padding: 3px 8px; border-radius: 6px;
}
.impact-banner__hint {
  font-size: 12px; color: #b45309; line-height: 1.5; margin: 0 0 12px;
}
.impact-banner__actions { display: flex; gap: 8px; }
.impact-banner__btn {
  font-size: 12px; padding: 6px 14px; border-radius: 8px;
  border: 1px solid #fcd34d; background: transparent; color: #92400e;
  cursor: pointer; transition: all .15s;
}
.impact-banner__btn:hover { background: #fef3c7; }
.impact-banner__btn--primary {
  background: #92400e; color: #fff; border-color: #92400e;
}
.impact-banner__btn--primary:hover { background: #78350f; }

/* ── Legacy impact ── */
.beats-view__impact { margin: var(--space-md) 0; display: flex; flex-direction: column; gap: var(--space-sm); }
.impact-item { margin: 0; }
.beats-view__actions { text-align: center; padding: var(--space-lg) 0; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; align-items: center; }
.confirm-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 24px; border-radius: 8px;
  background: #111827; color: #fff; border: none;
  font-size: 14px; cursor: pointer; transition: background .15s;
}
.confirm-btn:hover { background: #1f2937; }
.beats-view__confirmed { text-align: center; padding: var(--space-md) 0; }

/* ── Batch bottom bar ── */
.batch-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; border-top: 1px solid #e5e7eb;
  padding: 14px 24px; display: flex; align-items: center; gap: 12px;
  z-index: 40; box-shadow: 0 -2px 12px rgba(0,0,0,.06);
}
.batch-bar__count {
  font-size: 14px; color: #4b5563; white-space: nowrap; flex-shrink: 0;
}
.batch-bar__count strong { color: #111827; }
.batch-bar__input {
  flex: 1; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 8px 12px; font-size: 13px; outline: none;
}
.batch-bar__input:focus { border-color: #9ca3af; }
.batch-bar__btn {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 16px; border-radius: 8px; font-size: 13px;
  background: #111827; color: #fff; border: none;
  cursor: pointer; flex-shrink: 0; transition: background .15s;
}
.batch-bar__btn:hover { background: #1f2937; }
.batch-bar__btn:disabled { opacity: .4; cursor: not-allowed; }
.batch-bar__cancel {
  padding: 8px 12px; font-size: 13px; color: #6b7280;
  background: transparent; border: none; cursor: pointer; flex-shrink: 0;
}
.batch-bar__cancel:hover { color: #374151; }

/* Spinner for batch */
.icon-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
