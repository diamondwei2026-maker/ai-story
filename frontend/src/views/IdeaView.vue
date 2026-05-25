<template>
  <div data-testid="idea-view" class="idea-view">
    <h2 data-testid="idea-title" class="idea-view__title">灵感提取</h2>

    <div
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      class="idea-view__review-banner"
    >
      {{ reviewAnnotations }}
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="idea-loading" class="idea-view__loading">
      卖点方案生成中，请稍候...
    </div>

    <!-- Error -->
    <div v-if="error" data-testid="idea-error" class="idea-view__error">
      <p>{{ error }}</p>
      <button
        data-testid="idea-retry-btn"
        class="idea-view__retry-btn"
        @click="handleGenerate"
      >
        重试
      </button>
    </div>

    <!-- Step 1: Idea Input (no data yet) -->
    <div v-if="!ideaData && !loading" class="idea-view__empty">
      <IdeaInput
        v-model="ideaText"
        :disabled="false"
        placeholder="输入你的小说创意，例如：一个医生重生到星际时代的故事..."
      />
      <div class="idea-view__empty-actions">
        <button
          data-testid="generate-idea-btn"
          class="idea-view__generate-btn"
          :disabled="loading"
          @click="handleGenerate"
        >
          分析创意，生成卖点方案
        </button>
      </div>
    </div>

    <!-- Step 2: Sell Point Selection -->
    <template v-if="ideaData && !loading">
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

      <!-- Step 3: Summary Display -->
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
        <button
          data-testid="reject-idea-btn"
          class="idea-view__reject-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </button>
        <button
          v-if="summaryGenerated"
          data-testid="confirm-idea-btn"
          class="idea-view__confirm-btn"
          @click="handleConfirm"
        >
          确认灵感，进入设定阶段
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWorkflowStore } from '@/stores/useWorkflowStore';
import {
  generateIdea,
  generateIdeaSummary,
  confirmIdea,
  rejectIdea,
  getIdea,
} from '@/api/idea';
import type { IdeaResponse } from '@/api/idea';
import IdeaInput from '@/components/IdeaInput.vue';
import SellPointSelector from '@/components/SellPointSelector.vue';
import SummaryCard from '@/components/SummaryCard.vue';
import { useIdeaParser } from '@/composables/useIdeaParser';

const props = defineProps<{
  projectId: string;
}>();

const store = useWorkflowStore();

const ideaData = ref<IdeaResponse | null>(null);
const ideaText = ref('');
const feedbackText = ref('');
const selectedSellPointIndex = ref(-1);
const customBrief = ref('');
const loading = ref(false);
const summaryLoading = ref(false);
const error = ref<string | null>(null);

const output = computed(() => ideaData.value?.output);

const isConfirmed = computed(() => {
  return (
    ideaData.value?.status === 'CONFIRMED' ||
    store.getStepStatus('IDEA') === 'CONFIRMED'
  );
});

const reviewAnnotations = computed(() => {
  const annotations = ideaData.value?.review?.annotations;
  return typeof annotations === 'string' ? annotations : null;
});

const {
  sellPoints: parsedSellPoints,
  hasSummary: summaryGenerated,
  oneLiner: summaryOneLiner,
  fullSummary: summaryFull,
} = useIdeaParser(output);

onMounted(async () => {
  try {
    const existing = await getIdea(props.projectId);
    if (existing) {
      ideaData.value = existing;
      const review = existing.review as Record<string, unknown> | null;
      if (review && typeof review.selectedSellPoint === 'number') {
        selectedSellPointIndex.value = review.selectedSellPoint as number;
      }
    }
  } catch {
    // Silently ignore fetch errors on mount
  }
});

function onSelectSellPoint(index: number) {
  selectedSellPointIndex.value = index;
}

async function handleGenerate() {
  loading.value = true;
  error.value = null;
  try {
    const result = await generateIdea(props.projectId, {
      idea: ideaText.value,
    });
    ideaData.value = result;
    store.setStepStatus('IDEA', 'IN_PROGRESS');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '生成失败';
  } finally {
    loading.value = false;
  }
}

async function handleRegenerateWithFeedback(feedback: string) {
  loading.value = true;
  error.value = null;
  try {
    const result = await generateIdea(props.projectId, {
      idea: ideaText.value,
      feedback,
    });
    ideaData.value = result;
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
    ideaData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '简介生成失败';
  } finally {
    summaryLoading.value = false;
  }
}

async function handleConfirm() {
  try {
    const result = await confirmIdea(props.projectId, {
      selectedSellPoint: selectedSellPointIndex.value,
      customBrief: customBrief.value || undefined,
    });
    ideaData.value = result;
    store.setStepStatus('IDEA', 'CONFIRMED');
    store.setCurrentPhase('SETTING');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '确认失败';
  }
}

async function handleReject() {
  loading.value = true;
  error.value = null;
  try {
    const result = await rejectIdea(props.projectId);
    ideaData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '驳回失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.idea-view {
  padding: 16px 0;
}

.idea-view__title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.idea-view__review-banner {
  background-color: #fff8e1;
  color: #795548;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 16px;
}

.idea-view__loading {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.idea-view__error {
  background-color: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 6px;
  text-align: center;
  margin-bottom: 16px;
}

.idea-view__retry-btn {
  margin-top: 8px;
  padding: 6px 20px;
  background-color: #c62828;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.idea-view__empty {
  text-align: center;
}

.idea-view__empty-actions {
  padding: 0 24px 24px;
}

.idea-view__generate-btn {
  background-color: var(--color-gold);
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.idea-view__generate-btn:hover {
  opacity: 0.9;
}

.idea-view__generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.idea-view__actions {
  text-align: center;
  padding: 24px 0;
}

.idea-view__reject-btn {
  background: transparent;
  color: #c62828;
  border: 1px solid #c62828;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  margin-right: 16px;
  transition: all 0.3s;
}

.idea-view__reject-btn:hover {
  background: #c62828;
  color: #fff;
}

.idea-view__confirm-btn {
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.idea-view__confirm-btn:hover {
  opacity: 0.9;
}
</style>
