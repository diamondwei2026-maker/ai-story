<template>
  <div data-testid="idea-view" class="idea-view">
    <!-- Stage Header -->
    <div class="idea-view__header">
      <div>
        <h2 data-testid="idea-title" class="idea-view__title">灵感提取</h2>
        <p class="idea-view__desc">
          输入一个故事创意，AI 将分析市场可行性并生成差异化卖点方案
        </p>
      </div>
      <span
        v-if="isConfirmed"
        data-testid="confirmed-badge"
        class="confirmed-badge"
      >
        <CheckOutlined />
        已确认
      </span>
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="idea-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="idea-view__error"
    >
      <template #action>
        <a-button
          data-testid="idea-retry-btn"
          size="small"
          @click="handleGenerate"
          >重试</a-button
        >
      </template>
    </a-alert>

    <!-- Step 1: Idea Input -->
    <div v-if="!data && !loading" class="idea-view__card">
      <h3 class="idea-view__card-title">一句话故事创意</h3>
      <p class="idea-view__card-desc">
        用一句话描述你的故事核心，或从下方示例中获取灵感
      </p>

      <div class="idea-view__examples">
        <button
          v-for="(prompt, idx) in suggestedPrompts"
          :key="idx"
          class="idea-view__example-btn"
          @click="ideaText = prompt"
        >
          示例 {{ idx + 1 }}：{{ prompt.slice(0, 30) }}...
        </button>
      </div>

      <textarea
        v-model="ideaText"
        placeholder="例如：一个拥有时间停止能力的普通上班族，意外发现自己其实是被人工智能模拟的虚拟存在..."
        class="idea-view__textarea"
        rows="3"
      />

      <button
        data-testid="generate-idea-btn"
        class="idea-view__generate-btn"
        :disabled="!ideaText.trim()"
        @click="handleGenerate"
      >
        <ThunderboltOutlined />
        开始提取卖点
      </button>
    </div>

    <!-- Generating -->
    <div
      v-if="!isConfirmed && loading && !data"
      data-testid="idea-loading"
      class="idea-view__loading"
    >
      <LoadingOutlined class="idea-view__loading-icon" spin />
      <span>AI 正在分析市场并生成差异化卖点方案...</span>
    </div>

    <!-- Sell Points + Summary -->
    <template v-if="data && !loading">
      <!-- Sell Point Selection -->
      <div v-if="!summaryGenerated" class="idea-view__section">
        <div class="idea-view__section-header">
          <h3 class="idea-view__card-title">卖点方案（选择一个）</h3>
          <div class="idea-view__feedback-row">
            <input
              v-model="feedbackText"
              placeholder="输入反馈意见后重新生成..."
              class="idea-view__feedback-input"
            />
            <button
              class="idea-view__regenerate-btn"
              @click="handleRegenerateWithFeedback(feedbackText)"
            >
              <ReloadOutlined />
              重新生成
            </button>
          </div>
        </div>

        <!-- Sell Point Cards Grid -->
        <div class="idea-view__points-grid">
          <div
            v-for="point in parsedSellPoints"
            :key="point.index"
            data-testid="sell-point-card"
            class="sell-point-card"
            :class="{
              'sell-point-card--selected':
                selectedSellPointIndex === point.index,
            }"
            @click="onSelectSellPoint(point.index)"
          >
            <!-- Check mark -->
            <div
              v-if="selectedSellPointIndex === point.index"
              class="sell-point-card__check"
            >
              <CheckOutlined />
            </div>

            <div class="sell-point-card__header">
              <h4 class="sell-point-card__title">{{ point.title }}</h4>
              <span
                class="sell-point-card__score"
                :class="scoreClass(point.marketScore)"
              >
                市场 {{ point.marketScore }}
              </span>
            </div>

            <div class="sell-point-card__body">
              <div class="sell-point-card__field">
                <span class="sell-point-card__label">核心卖点</span>
                <p class="sell-point-card__text">{{ point.coreSellPoint }}</p>
              </div>
              <!-- <div class="sell-point-card__field">
                <span class="sell-point-card__label">爆款参考作品</span>
                <div class="sell-point-card__tags">
                  <span
                    v-for="ref in point.hitReferences"
                    :key="ref"
                    class="sell-point-card__tag"
                  >{{ ref }}</span>
                </div>
              </div> -->
              <div class="sell-point-card__field">
                <span class="sell-point-card__label">差异化分析</span>
                <p class="sell-point-card__text sell-point-card__text--small">
                  {{ point.differentiation }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Generate Summary Button -->
        <div class="idea-view__summary-action">
          <button
            data-testid="generate-summary-btn"
            class="idea-view__generate-btn"
            :disabled="selectedSellPointIndex < 0 || summaryLoading"
            @click="handleGenerateSummary(selectedSellPointIndex)"
          >
            <ThunderboltOutlined />
            生成简介
            <RightOutlined />
          </button>
        </div>

        <!-- Summary Loading -->
        <div v-if="summaryLoading" class="idea-view__loading">
          <LoadingOutlined class="idea-view__loading-icon" spin />
          <span>AI 正在基于所选卖点方案生成故事简介...</span>
        </div>
      </div>

      <!-- Summary Display -->
      <div
        v-if="summaryGenerated"
        class="idea-view__card idea-view__card--summary"
      >
        <h3 class="idea-view__card-title">生成的故事简介</h3>

        <!-- Selected Point Badge -->
        <div v-if="selectedSellPoint" class="idea-view__selected-badge">
          <CheckOutlined />
          基于卖点方案：{{ selectedSellPoint.title }}
        </div>

        <div class="idea-view__summary">
          <div class="idea-view__summary-block">
            <span class="idea-view__summary-label">一句话简介</span>
            <p class="idea-view__summary-text">{{ summaryOneLiner }}</p>
          </div>
          <div class="idea-view__summary-block">
            <span class="idea-view__summary-label">500字简介</span>
            <p class="idea-view__summary-full">{{ summaryFull }}</p>
          </div>
        </div>

        <!-- Confirm Button -->
        <div v-if="!isConfirmed" class="idea-view__confirm-action">
          <button
            data-testid="confirm-idea-btn"
            class="idea-view__generate-btn idea-view__generate-btn--confirm"
            @click="handleConfirm"
          >
            <CheckOutlined />
            确认，进入设定集阶段
            <RightOutlined />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  CheckOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons-vue";
import { usePhaseWorkflow } from "@/composables/usePhaseWorkflow";
import {
  generateIdea,
  generateIdeaSummary,
  confirmIdea,
  rejectIdea,
  getIdea,
} from "@/api/idea";
import type { StepDataResponse } from "@/api/common";
import { useIdeaParser } from "@/composables/useIdeaParser";

const props = defineProps<{
  projectId: string;
}>();

const ideaText = ref("");
const feedbackText = ref("");
const selectedSellPointIndex = ref(-1);
const customBrief = ref("");
const summaryLoading = ref(false);

const suggestedPrompts = [
  "一位失忆的古代将领穿越到现代，发现自己竟然是某个神秘组织的预言中人",
  "末日病毒爆发后，一名外科医生发现少数人对病毒有天然免疫，而她的女儿就是其中之一",
  "科技巨头秘密研发了可以储存人类记忆的芯片，主角意外获取了一段不该存在的记忆",
];

const { data, loading, error, isConfirmed, handleGenerate, handleConfirm } =
  usePhaseWorkflow<StepDataResponse>({
    projectId: props.projectId,
    phase: "IDEA",
    nextPhase: "SETTING",
    getFn: getIdea,
    generateFn: generateIdea,
    confirmFn: (projectId) =>
      confirmIdea(projectId, {
        selectedSellPoint: selectedSellPointIndex.value,
        customBrief: customBrief.value || undefined,
      }),
    rejectFn: rejectIdea,
    generateArgs: () => ({ idea: ideaText.value }),
  });

// Restore selectedSellPointIndex from backend
watch(data, (newData) => {
  if (newData) {
    const review = newData.review as Record<string, unknown> | null;
    if (review && typeof review.selectedSellPoint === "number") {
      selectedSellPointIndex.value = review.selectedSellPoint as number;
    }

    // 从后端 input 字段恢复 ideaText（页面刷新 / 已有数据加载场景）
    if (newData.input && !ideaText.value) {
      const raw = newData.input;
      if (raw.startsWith("idea: ")) {
        const fbIdx = raw.indexOf("\nfeedback:");
        ideaText.value =
          fbIdx > -1 ? raw.slice(6, fbIdx).trim() : raw.slice(6).trim();
      } else {
        ideaText.value = raw.trim();
      }
    }
  }
});

const output = computed(() => data.value?.output);
const review = computed(() => data.value?.review);

const {
  sellPoints: parsedSellPoints,
  hasSummary: summaryGenerated,
  oneLiner: summaryOneLiner,
  fullSummary: summaryFull,
} = useIdeaParser(output, review);

const selectedSellPoint = computed(() =>
  selectedSellPointIndex.value >= 0
    ? parsedSellPoints.value.find(
        (p) => p.index === selectedSellPointIndex.value,
      )
    : null,
);

function scoreClass(score: number): string {
  if (score >= 9) return "score--emerald";
  if (score >= 7) return "score--blue";
  return "score--amber";
}

function onSelectSellPoint(index: number) {
  selectedSellPointIndex.value = index;
}

async function handleRegenerateWithFeedback(feedback: string) {
  loading.value = true;
  error.value = null;
  try {
    const result = await generateIdea(props.projectId, {
      idea: ideaText.value,
      feedback,
    });
    data.value = result;
    selectedSellPointIndex.value = -1;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "重新生成失败";
  } finally {
    loading.value = false;
  }
}

async function handleGenerateSummary(sellPointIndex: number) {
  summaryLoading.value = true;
  error.value = null;
  try {
    const result = await generateIdeaSummary(props.projectId, {
      selectedSellPoint: sellPointIndex,
    });
    data.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "简介生成失败";
  } finally {
    summaryLoading.value = false;
  }
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────── */
.idea-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px 24px;
  max-width: 1024px;
  margin: 0 auto;
}

.idea-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.idea-view__title {
  font-size: var(--font-size-heading);
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.idea-view__desc {
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
  flex-shrink: 0;
}

/* ── Card ──────────────────────────────────────────────── */
.idea-view__card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.idea-view__card-title {
  font-size: var(--font-size-section);
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.idea-view__card-desc {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 0;
}

/* ── Examples ──────────────────────────────────────────── */
.idea-view__examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.idea-view__example-btn {
  font-size: var(--font-size-caption);
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 12px;
  color: #4b5563;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.idea-view__example-btn:hover {
  background: #f3f4f6;
}

/* ── Textarea ──────────────────────────────────────────── */
.idea-view__textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-size: var(--font-size-body);
  color: #374151;
  background: #f9fafb;
  resize: none;
  outline: none;
  min-height: 80px;
  box-sizing: border-box;
}

.idea-view__textarea:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}

.idea-view__textarea::placeholder {
  color: #9ca3af;
}

/* ── Buttons ───────────────────────────────────────────── */
.idea-view__generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  align-self: flex-start;
}

.idea-view__generate-btn:hover:not(:disabled) {
  background: #374151;
}

.idea-view__generate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.idea-view__generate-btn--confirm {
  align-self: flex-end;
  padding: 10px 24px;
}

/* ── Loading ───────────────────────────────────────────── */
.idea-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  color: #6d28d9;
  font-size: var(--font-size-body);
}

.idea-view__loading-icon {
  font-size: 18px;
}

/* ── Error ─────────────────────────────────────────────── */
.idea-view__error {
}

/* ── Section ───────────────────────────────────────────── */
.idea-view__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.idea-view__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.idea-view__feedback-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.idea-view__feedback-input {
  font-size: var(--font-size-body);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 12px;
  width: 224px;
  color: #374151;
  outline: none;
  background: #f9fafb;
}

.idea-view__feedback-input:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}

.idea-view__regenerate-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: #4b5563;
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.idea-view__regenerate-btn:hover {
  background: #f9fafb;
}

/* ── Sell Point Cards ──────────────────────────────────── */
.idea-view__points-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.sell-point-card {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.sell-point-card:hover {
  border-color: #9ca3af;
}

.sell-point-card--selected {
  border-color: #111827;
  background: #f9fafb;
}

.sell-point-card__check {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  background: #111827;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: var(--font-size-caption);
}

.sell-point-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.sell-point-card__title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: #111827;
  margin: 0;
  padding-right: 24px;
}

.sell-point-card__score {
  flex-shrink: 0;
  font-size: var(--font-size-caption);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.score--emerald {
  color: #059669;
  background: #ecfdf5;
}

.score--blue {
  color: #2563eb;
  background: #eff6ff;
}

.score--amber {
  color: #d97706;
  background: #fffbeb;
}

.sell-point-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sell-point-card__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sell-point-card__label {
  font-size: var(--font-size-caption);
  color: #9ca3af;
}

.sell-point-card__text {
  font-size: var(--font-size-body);
  color: #374151;
  line-height: 1.6;
  margin: 0;
}

.sell-point-card__text--small {
  font-size: var(--font-size-caption);
  color: #4b5563;
}

.sell-point-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sell-point-card__tag {
  font-size: var(--font-size-caption);
  background: #f3f4f6;
  color: #4b5563;
  border-radius: 4px;
  padding: 2px 8px;
}

/* ── Summary Action ─────────────────────────────────────── */
.idea-view__summary-action {
  display: flex;
  justify-content: flex-end;
}

/* ── Summary Card ────────────────────────────────────────── */
.idea-view__card--summary {
  gap: 20px;
}

/* ── Summary ────────────────────────────────────────────── */
.idea-view__selected-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body);
  color: #6d28d9;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 6px;
  padding: 8px 12px;
}

.idea-view__summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.idea-view__summary-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.idea-view__summary-label {
  font-size: var(--font-size-caption);
  color: #9ca3af;
}

.idea-view__summary-text {
  font-size: var(--font-size-body);
  color: #1f2937;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  padding: 12px;
  border-radius: 8px;
  line-height: 1.6;
  margin: 0;
}

.idea-view__summary-full {
  font-size: var(--font-size-body);
  color: #374151;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  padding: 16px;
  border-radius: 8px;
  line-height: 1.8;
  white-space: pre-line;
  margin: 0;
}

/* ── Confirm ────────────────────────────────────────────── */
.idea-view__confirm-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
