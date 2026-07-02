<template>
  <div data-testid="outline-view" class="outline-view">
    <!-- Stage Header -->
    <div class="outline-view__header">
      <div>
        <h2 data-testid="outline-title" class="outline-view__title">剧情大纲</h2>
        <p class="outline-view__desc">规划故事宏观结构和叙事节奏，选择叙事结构模板生成完整大纲</p>
      </div>
      <span v-if="isConfirmed" class="confirmed-badge">
        <CheckCircleOutlined />
        已确认
      </span>
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="outline-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="outline-view__error"
    >
      <template #action>
        <a-button data-testid="outline-retry-btn" size="small" @click="handleGenerate">重试</a-button>
      </template>
    </a-alert>

    <!-- Generating State -->
    <div v-if="loading && !outlineData" data-testid="outline-loading" class="outline-view__generating">
      <LoadingOutlined spin class="outline-view__generating-icon" />
      <span>AI 正在基于设定集生成完整剧情大纲...</span>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="!outlineData && !loading && initialLoadDone"
      description="大纲尚未生成"
    />

    <!-- Structure Selector — always visible when not loading -->
    <div v-if="!loading" class="outline-view__structure" data-testid="structure-switcher">
      <div class="outline-view__structure-field">
        <label class="outline-view__structure-label">叙事结构模板</label>
        <select
          v-model="selectedStructure"
          class="outline-view__structure-select"
          :disabled="isConfirmed"
          @change="onStructureChange($event)"
        >
          <option
            v-for="opt in structureOptions"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
        <p class="outline-view__structure-desc">{{ currentStructureDesc }}</p>
      </div>
      <button
        v-if="!isConfirmed && !(outlineData && outlineData.output)"
        data-testid="generate-outline-btn"
        class="outline-view__generate-btn"
        @click="handleGenerate"
      >
        <ThunderboltOutlined />
        生成大纲
      </button>
    </div>

    <!-- Structure Switch Confirm Modal -->
    <a-modal
      v-model:open="showStructureModal"
      title="确认切换叙事结构"
      :get-container="false"
      @cancel="cancelSwitchStructure"
    >
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <ExclamationCircleOutlined style="color:#f59e0b;font-size:20px;margin-top:2px;" />
        <p style="margin:0;color:#6b7280;font-size:var(--font-size-body);">
          切换叙事结构将重新组织大纲，关键情节点种子被保留但其余内容将重新生成。确定继续吗？
        </p>
      </div>
      <template #footer>
        <a-button data-testid="structure-switch-cancel" @click="cancelSwitchStructure">取消</a-button>
        <a-button type="primary" data-testid="structure-switch-confirm" @click="confirmSwitchStructure">确认切换并重新生成</a-button>
      </template>
    </a-modal>

    <!-- Generating overlay for re-generation -->
    <div v-if="loading && outlineData" class="outline-view__generating">
      <LoadingOutlined spin class="outline-view__generating-icon" />
      <span>AI 正在基于设定集生成完整剧情大纲...</span>
    </div>

    <!-- Outline Content -->
    <template v-if="outlineData && outlineData.output && !loading">
      <!-- Act/Segment nested cards -->
      <div v-if="parsedOutline.length > 0" class="outline-view__acts">
        <div
          v-for="(act, actIdx) in parsedOutline"
          :key="'act-' + actIdx"
          class="outline-act"
          :class="'outline-act--' + act.color"
        >
          <div class="outline-act__header">
            <span class="outline-act__badge">第{{ act.actNumber }}幕</span>
            <h3 class="outline-act__title">{{ act.actTitle }}</h3>
          </div>
          <div class="outline-act__segments">
            <SegmentCard
              v-for="seg in act.segments"
              :key="seg.id"
              :segment="seg"
            />
          </div>
        </div>
      </div>

      <!-- Fallback: raw markdown when parsing fails -->
      <div v-else class="outline-view__raw">
        <MarkdownRenderer :content="stripEmotionTags(outlineData.output)" />
      </div>

      <!-- Analysis Panel -->
      <div v-if="analysis && parsedOutline.length > 0" class="outline-analysis">
        <button class="outline-analysis__toggle" @click="showAnalysis = !showAnalysis">
          <span>结构节奏分析与审查注释</span>
          <DownOutlined :class="{ 'is-flipped': showAnalysis }" />
        </button>
        <div v-if="showAnalysis" class="outline-analysis__body">
          <div class="outline-analysis__grid">
            <div class="analysis-card analysis-card--blue">
              <div class="analysis-card__label">节奏分析</div>
              <p>{{ analysis.rhythmNote || '暂无节奏分析数据' }}</p>
            </div>
            <div class="analysis-card analysis-card--emerald">
              <div class="analysis-card__label">冲突分布</div>
              <p>{{ analysis.conflictNote || '暂无冲突分析数据' }}</p>
            </div>
            <div class="analysis-card analysis-card--violet">
              <div class="analysis-card__label">高潮点检测</div>
              <p>{{ analysis.climaxNote || '暂无高潮检测数据' }}</p>
            </div>
          </div>
          <div v-if="analysis.warning" class="analysis-warning">
            <ExclamationCircleOutlined />
            <div>
              <div class="analysis-warning__label">节奏预警</div>
              <p>{{ analysis.warning }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!isConfirmed" class="outline-view__actions">
        <a-button danger data-testid="reject-outline-btn" @click="handleReject">
          <CloseOutlined /> 驳回并重新生成
        </a-button>
        <a-button type="primary" data-testid="confirm-outline-btn" class="outline-view__confirm-btn" @click="handleConfirm">
          <CheckCircleOutlined /> 确认大纲，进入细纲阶段 <RightOutlined />
        </a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  CheckCircleOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  CloseOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
} from '@ant-design/icons-vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import {
  generateOutline,
  confirmOutline,
  rejectOutline,
  getOutline,
  switchStructure,
} from '@/api/outline';
import { getSetting } from '@/api/setting';
import { getIdea } from '@/api/idea';
import type { StepDataResponse } from '@/api/common';
import EmptyState from '@/components/EmptyState.vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import SegmentCard from '@/components/SegmentCard.vue';
import type { SegmentData } from '@/components/SegmentCard.vue';

const props = defineProps<{
  projectId: string;
}>();

const selectedStructure = ref('web-novel-ten');
const showStructureModal = ref(false);
const pendingStructure = ref<string | null>(null);
const previousStructure = ref('web-novel-ten');

const STRUCTURE_DESCS: Record<string, string> = {
  'three-act': '经典戏剧结构，建立、对抗、解决，适合节奏紧凑的故事',
  'web-novel-ten': '适合长篇网文，含开场、成长、转折、决战等十个标准段落',
  'hero-journey': '坎贝尔原型结构，主角召唤、历险、归来，适合成长类故事',
  'kishotenketsu': '东方四段式叙事，适合情感细腻、节奏舒缓的故事',
};

const structureOptions = [
  { value: 'web-novel-ten', label: '网文十段结构（推荐）' },
  { value: 'three-act', label: '三幕剧结构' },
  { value: 'hero-journey', label: '英雄之旅' },
  { value: 'kishotenketsu', label: '起承转合' },
];

const currentStructureDesc = computed(() => {
  return STRUCTURE_DESCS[selectedStructure.value] ?? '';
});

/** 从 step input 字段解析当前叙事结构 */
function parseStructureFromInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = input.match(/structure:\s*(\S+)/);
  return match ? match[1] : null;
}

const {
  data: outlineData,
  loading,
  error,
  isConfirmed,
  initialLoadDone,
  handleGenerate,
  handleConfirm,
  handleReject,
} = usePhaseWorkflow<StepDataResponse>({
  projectId: props.projectId,
  phase: 'OUTLINE',
  nextPhase: 'BEATS',
  getFn: getOutline,
  generateFn: generateOutline,
  confirmFn: confirmOutline,
  rejectFn: rejectOutline,
  generateArgs: () => ({ setting: '', structure: selectedStructure.value }),
  previousPhases: [
    { phase: 'IDEA', getFn: getIdea },
    { phase: 'SETTING', getFn: getSetting },
  ],
});

// 当 outlineData 就绪时，从 input 字段解析并同步叙事结构选择器
watch(outlineData, (data) => {
  if (data) {
    const parsed = parseStructureFromInput((data as any)?.input);
    if (parsed && structureOptions.some((o) => o.value === parsed)) {
      selectedStructure.value = parsed;
    }
  }
});

// ─── Outline Parsing: flat text → nested Act/Segment ─────

interface OutlineActData {
  actNumber: number;
  actTitle: string;
  color: string;
  segments: SegmentData[];
}

const ACT_COLORS = ['violet', 'blue', 'emerald', 'amber'];

const EMOTION_KEYWORDS = ['爽点', '虐点', '高潮', '伏笔', '转折', '铺垫', '冲突', '悬念'];

function stripEmotionTags(text: string): string {
  return text.replace(/\[([^\]]*)\]/g, (_, inner: string) =>
    EMOTION_KEYWORDS.some((k) => inner.includes(k)) ? '' : `[${inner}]`,
  ).replace(/ {2,}/g, ' ');
}

function parseSegmentBlock(block: string, index: number, parentTitle: string): SegmentData {
  const lines = block.trim().split('\n');
  const rawTitle = (lines[0] ?? `段落${index + 1}`).replace(/^#{2,3}\s*/, '').trim();
  const title = stripEmotionTags(rawTitle);
  const body = lines.slice(1).join('\n').trim();

  // Extract key events: **bold** text or - list items
  const boldMatches = body.match(/\*\*(.+?)\*\*/g) ?? [];
  const listMatches = body.match(/^[-•]\s*(.+)$/gm) ?? [];
  const keyEvents = [
    ...new Set([
      ...boldMatches.map(s => s.replace(/\*\*/g, '')),
      ...listMatches.map(s => s.replace(/^[-•]\s*/, '')),
    ]),
  ].slice(0, 6);

  const isClimax = title.includes('高潮') || body.includes('高潮点');
  const chapterMatch = body.match(/第\d+[-–—]\d+章/);
  const chapterRange = chapterMatch ? chapterMatch[0] : '';

  return {
    id: `seg-${parentTitle}-${index}`,
    title: title || `第${index + 1}段`,
    summary: body.slice(0, 150).replace(/\[[^\]]*\]/g, '').trim(),
    keyEvents,
    isClimax,
    chapterRange,
  };
}

const parsedOutline = computed<OutlineActData[]>(() => {
  const output = outlineData.value?.output ?? '';
  if (!output.trim()) return [];

  // Strategy 1: Act structure (## 第X幕 / Act N)
  const actRegex = /\n(?=##\s+(?:第[一二三四五六七八九十]+幕|Act\s+\d+))/g;
  const actBlocks = ('\n' + output).split(actRegex).filter(s => s.trim());

  if (actBlocks.length > 0 && /##\s+(?:第[一二三四五六七八九十]+幕|Act\s+\d+)/.test(actBlocks[0])) {
    return actBlocks.map((block, actIdx) => {
      const actLines = block.trim().split('\n');
      const actTitleRaw = actLines[0].replace(/^##\s*/, '').trim();
      const actTitle = stripEmotionTags(actTitleRaw) || `第${actIdx + 1}幕`;
      const actBody = actLines.slice(1).join('\n');

      // Extract segments within this act (### 第X段 or ## 第X段)
      const segRegex = /\n(?=#{2,3}\s+(?:第[一二三四五六七八九十]+段|第\d+段))/g;
      const segBlocks = ('\n' + actBody).split(segRegex).filter(s => s.trim());

      let segments: SegmentData[];
      if (segBlocks.length > 0 && /#{2,3}\s+(?:第[一二三四五六七八九十]+段|第\d+段)/.test(segBlocks[0])) {
        segments = segBlocks.map((seg, i) => parseSegmentBlock(seg, i, actTitle));
      } else if (actBody.trim()) {
        // No sub-segments: treat act itself as single segment
        segments = [{
          id: `seg-${actTitle}-0`,
          title: actTitle,
          summary: actBody.slice(0, 150).replace(/\[[^\]]*\]/g, '').trim(),
          keyEvents: [],
          isClimax: actTitle.includes('高潮'),
          chapterRange: '',
        }];
      } else {
        segments = [];
      }

      return {
        actNumber: actIdx + 1,
        actTitle,
        color: ACT_COLORS[actIdx % ACT_COLORS.length],
        segments,
      };
    });
  }

  // Strategy 2: No acts — flat segments (## 第X段)
  const flatSegRegex = /\n(?=##\s+(?:第[一二三四五六七八九十]+段|第\d+段))/g;
  const flatSegBlocks = ('\n' + output).split(flatSegRegex).filter(s => s.trim());

  if (flatSegBlocks.length > 0 && /##\s+(?:第[一二三四五六七八九十]+段|第\d+段)/.test(flatSegBlocks[0])) {
    const segments = flatSegBlocks.map((seg, i) => parseSegmentBlock(seg, i, '大纲'));
    return [{
      actNumber: 1,
      actTitle: '剧情大纲',
      color: 'violet',
      segments,
    }];
  }

  // Strategy 3: Legacy line-by-line title detection
  const lines = output.split('\n').filter(Boolean);
  if (lines.length > 0 && lines.every((l) => /^(#{1,3}\s|第.+[幕章节段])/.test(l.trim()))) {
    const segments: SegmentData[] = lines.map((line, i) => {
      const cleaned = stripEmotionTags(line.replace(/^#{1,3}\s*/, '').trim());
      return {
        id: `seg-legacy-${i}`,
        title: cleaned || `第${i + 1}段`,
        summary: '',
        keyEvents: [],
        isClimax: cleaned.includes('高潮'),
        chapterRange: '',
      };
    });
    return [{
      actNumber: 1,
      actTitle: '剧情大纲',
      color: 'violet',
      segments,
    }];
  }

  return [];
});

// ─── Analysis Panel Data ────────────────────────────────────

const showAnalysis = ref(false);

const analysis = computed(() => {
  const review = (outlineData.value as any)?.review as Record<string, unknown> | undefined;
  if (!review) return null;

  const paceNote = (review.structurePacing as any)?.note ?? '';
  const conflictNote = (review.conflictReview as any)?.note ?? '';
  const climaxNote = (review.climaxReview as any)?.note ?? '';
  const warning = (review.structurePacing as any)?.warning ?? '';

  if (!paceNote && !conflictNote && !climaxNote && !warning) return null;

  return { rhythmNote: paceNote, conflictNote, climaxNote, warning };
});

// ─── Structure Switch ───────────────────────────────────────

function onStructureChange(event: Event | string) {
  const strValue = typeof event === 'string'
    ? event
    : String((event as Event & { target: HTMLSelectElement }).target?.value ?? '');
  if (!strValue) return;
  if (outlineData.value && (isConfirmed.value || outlineData.value.output)) {
    previousStructure.value = selectedStructure.value;
    pendingStructure.value = strValue;
    showStructureModal.value = true;
  } else {
    selectedStructure.value = strValue;
  }
}

function cancelSwitchStructure() {
  if (pendingStructure.value) {
    selectedStructure.value = previousStructure.value;
    pendingStructure.value = null;
  }
  showStructureModal.value = false;
}

async function confirmSwitchStructure() {
  if (!pendingStructure.value) {
    showStructureModal.value = false;
    return;
  }
  const targetStructure = pendingStructure.value;
  pendingStructure.value = null;
  showStructureModal.value = false;

  loading.value = true;
  error.value = null;
  try {
    const result = await switchStructure(props.projectId, targetStructure);
    outlineData.value = result;
    showAnalysis.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '切换结构失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.outline-view {
  max-width: 1024px;
  margin: 0 auto;
  padding: 32px 24px;
}

.outline-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.outline-view__title {
  font-size: var(--font-size-heading);
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.outline-view__desc {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 0;
}

.confirmed-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 6px 12px;
  border-radius: 6px;
}

.outline-view__error { margin-bottom: 16px; }

/* ── Generating ─────────────────────────────────────── */
.outline-view__generating {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  color: #059669;
  font-size: var(--font-size-body);
  margin-bottom: 16px;
}

.outline-view__generating-icon { font-size: 18px; }

/* ── Structure Selector ───────────────────────────────── */
.outline-view__structure {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.outline-view__structure-field {
  flex: 1;
  min-width: 240px;
}

.outline-view__structure-label {
  font-size: var(--font-size-body);
  color: #4b5563;
  display: block;
  margin-bottom: 8px;
}

.outline-view__structure-select {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: var(--font-size-body);
  color: #1f2937;
  background: #fff;
  outline: none;
}

.outline-view__structure-select:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}

.outline-view__structure-select:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.outline-view__structure-desc {
  font-size: var(--font-size-caption);
  color: #9ca3af;
  margin: 6px 0 0;
}

.outline-view__generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  align-self: flex-end;
  margin-bottom: 2px;
}

.outline-view__generate-btn:hover { background: #374151; }

/* ── Act Cards ──────────────────────────────────────── */
.outline-view__acts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.outline-act {
  border-radius: 12px;
  border: 1px solid;
  padding: 20px;
}

.outline-act--violet {
  background: #f5f3ff;
  border-color: #ddd6fe;
}
.outline-act--blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.outline-act--emerald {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.outline-act--amber {
  background: #fffbeb;
  border-color: #fde68a;
}

.outline-act__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.outline-act__badge {
  font-size: var(--font-size-caption);
  padding: 2px 8px;
  border-radius: 999px;
}

.outline-act--violet .outline-act__badge {
  background: #ede9fe;
  color: #6d28d9;
}
.outline-act--blue .outline-act__badge {
  background: #dbeafe;
  color: #1d4ed8;
}
.outline-act--emerald .outline-act__badge {
  background: #d1fae5;
  color: #047857;
}
.outline-act--amber .outline-act__badge {
  background: #fef3c7;
  color: #b45309;
}

.outline-act__title {
  font-size: var(--font-size-body);
  font-weight: 600;
  margin: 0;
}

.outline-act--violet .outline-act__title { color: #6d28d9; }
.outline-act--blue   .outline-act__title { color: #1d4ed8; }
.outline-act--emerald .outline-act__title { color: #047857; }
.outline-act--amber  .outline-act__title { color: #b45309; }

.outline-act__segments {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

/* ── Raw Markdown Fallback ──────────────────────────── */
.outline-view__raw {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}

/* ── Analysis Panel ─────────────────────────────────── */
.outline-analysis {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.outline-analysis__toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: none;
  border: none;
  font-size: var(--font-size-body);
  color: #374151;
  cursor: pointer;
}

.outline-analysis__toggle:hover {
  background: #f9fafb;
}

.is-flipped {
  transform: rotate(180deg);
  transition: transform 0.2s;
}

.outline-analysis__body {
  border-top: 1px solid #e5e7eb;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.outline-analysis__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .outline-analysis__grid {
    grid-template-columns: 1fr;
  }
}

.analysis-card {
  border-radius: 8px;
  border: 1px solid;
  padding: 12px;
}

.analysis-card--blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.analysis-card--emerald {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.analysis-card--violet {
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.analysis-card__label {
  font-size: var(--font-size-caption);
  font-weight: 500;
  margin-bottom: 4px;
}

.analysis-card--blue   .analysis-card__label { color: #1d4ed8; }
.analysis-card--emerald .analysis-card__label { color: #047857; }
.analysis-card--violet .analysis-card__label { color: #6d28d9; }

.analysis-card p {
  font-size: var(--font-size-caption);
  color: #374151;
  line-height: 1.6;
  margin: 0;
}

.analysis-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px;
  color: #92400e;
  font-size: var(--font-size-caption);
}

.analysis-warning__label {
  font-weight: 500;
  margin-bottom: 2px;
}

.analysis-warning p {
  margin: 0;
  line-height: 1.6;
}

/* ── Actions ────────────────────────────────────────── */
.outline-view__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.outline-view__confirm-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827 !important;
  border-color: #111827 !important;
  color: #fff !important;
}

.outline-view__confirm-btn:hover:not(:disabled) {
  background: #374151 !important;
  border-color: #374151 !important;
}
</style>
