<template>
  <div data-testid="idea-view" class="idea-view">
    <h2 data-testid="idea-title" class="idea-view__title section-title">灵感提取</h2>

    <!-- Sub-step indicator -->
    <div class="idea-view__substeps">
      <a-steps :current="currentSubStep" size="small">
        <a-step title="输入创意" />
        <a-step title="选择卖点" />
        <a-step title="审核简介" />
      </a-steps>
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="idea-loading" class="idea-view__loading">
      <a-spin tip="卖点方案生成中，请稍候..." />
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
        >
          重试
        </a-button>
      </template>
    </a-alert>

    <!-- Step 0: Idea Input (no data yet) -->
    <div v-if="!data && !loading" class="idea-view__empty">
      <IdeaInput
        v-model="ideaText"
        :disabled="false"
        placeholder="描述你的故事创意..."
      />
      <div class="idea-view__prompts">
        <span class="idea-view__prompts-label caption">试试这个灵感：</span>
        <a-tag
          v-for="prompt in suggestedPrompts"
          :key="prompt"
          class="idea-view__prompt-tag"
          @click="ideaText = prompt"
        >
          {{ prompt }}
        </a-tag>
      </div>
      <div class="idea-view__empty-actions">
        <a-button
          type="primary"
          data-testid="generate-idea-btn"
          :loading="loading"
          @click="handleGenerate"
        >
          分析创意，生成卖点方案
        </a-button>
      </div>
    </div>

    <!-- Step 1: Sell Point Selection -->
    <template v-if="data && !loading">
      <SellPointSelector
        v-if="!summaryGenerated"
        :sell-points="parsedSellPoints"
        :selected-index="selectedSellPointIndex"
        :loading="summaryLoading"
        :feedback="feedbackText"
        @select="onSelectSellPoint"
        @update:feedback="feedbackText = $event"
        @regenerate="handleRegenerateWithFeedback"
        @generate-summary="handleGenerateSummary"
      />

      <!-- Step 2: Summary Display -->
      <SummaryCard
        v-if="summaryGenerated"
        :one-liner="summaryOneLiner"
        :full-summary="summaryFull"
        :loading="false"
        :editable="!isConfirmed"
        :custom-brief="customBrief"
        @update:custom-brief="customBrief = $event"
      />

      <!-- Action buttons -->
      <div
        v-if="!isConfirmed"
        class="idea-view__actions"
      >
        <a-button
          v-if="summaryGenerated"
          type="primary"
          data-testid="confirm-idea-btn"
          class="amber-btn"
          @click="handleConfirm"
        >
          确认灵感，进入设定阶段
        </a-button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import {
  generateIdea,
  generateIdeaSummary,
  confirmIdea,
  rejectIdea,
  getIdea,
} from '@/api/idea';
import type { StepDataResponse } from '@/api/common';
import IdeaInput from '@/components/IdeaInput.vue';
import SellPointSelector from '@/components/SellPointSelector.vue';
import SummaryCard from '@/components/SummaryCard.vue';
import { useIdeaParser } from '@/composables/useIdeaParser';

const props = defineProps<{
  projectId: string;
}>();

const ideaText = ref('');
const feedbackText = ref('');
const selectedSellPointIndex = ref(-1);
const customBrief = ref('');
const summaryLoading = ref(false);

const suggestedPrompts = [
  '一个能预见未来5分钟的侦探',
  '一个魔法是有限资源的王国',
  '两个星际殖民地里互相竞争的厨师',
];

const {
  data,
  loading,
  error,
  isConfirmed,
  handleGenerate,
  handleConfirm,
} = usePhaseWorkflow<StepDataResponse>({
  projectId: props.projectId,
  phase: 'IDEA',
  nextPhase: 'SETTING',
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

// 从后端恢复 selectedSellPointIndex（用户刷新页面后不丢失卖点选择状态）
watch(data, (newData) => {
  if (newData) {
    const review = newData.review as Record<string, unknown> | null;
    if (review && typeof review.selectedSellPoint === 'number') {
      selectedSellPointIndex.value = review.selectedSellPoint as number;
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

const currentSubStep = computed(() => {
  if (isConfirmed.value) return 3;
  if (summaryGenerated.value) return 2;
  if (data.value && !summaryGenerated.value) return 1;
  return 0;
});

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
    feedbackText.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重新生成失败';
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
    error.value = e instanceof Error ? e.message : '简介生成失败';
  } finally {
    summaryLoading.value = false;
  }
}
</script>

<style scoped>
.idea-view {
  padding: var(--space-md) 0;
}

.idea-view__title {
  margin-bottom: var(--space-md);
}

.idea-view__substeps {
  margin-bottom: var(--space-xl);
}

.idea-view__loading {
  text-align: center;
  padding: var(--space-xl);
}

.idea-view__error {
  margin-bottom: var(--space-md);
}

.idea-view__empty {
  text-align: center;
}

.idea-view__prompts {
  padding: 0 var(--space-lg) var(--space-md);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  justify-content: center;
}

.idea-view__prompts-label {
  color: var(--color-text-muted);
}

.idea-view__prompt-tag {
  cursor: pointer;
}

.idea-view__empty-actions {
  padding: 0 var(--space-lg) var(--space-lg);
}

.idea-view__actions {
  text-align: center;
  padding: var(--space-lg) 0;
}
</style>
