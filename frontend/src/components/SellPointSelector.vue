<template>
  <div data-testid="sellpoint-selector" class="sellpoint-selector">
    <h3 data-testid="sellpoint-section-title" class="sellpoint-selector__title">
      选择核心卖点方案
    </h3>

    <div v-if="loading" data-testid="sellpoint-loading" class="sellpoint-selector__loading">
      <a-spin tip="卖点方案生成中..." />
    </div>

    <!-- P2 空态提示：数据返回但解析为空 -->
    <a-alert
      v-else-if="sellPoints.length === 0"
      data-testid="sellpoint-empty-warning"
      type="warning"
      message="卖点方案数据解析异常"
      description="AI 返回了数据但无法解析，请尝试重新生成。"
      show-icon
      class="sellpoint-selector__empty-warning"
    >
      <template #action>
        <a-button size="small" @click="$emit('regenerate', '')">
          重新生成
        </a-button>
      </template>
    </a-alert>

    <div v-else class="sellpoint-selector__cards">
      <MarketAnalysisCard
        v-for="sp in sellPoints"
        :key="sp.index"
        :sell-point="sp"
        :selected="sp.index === selectedIndex"
        @select="$emit('select', sp.index)"
      />
    </div>

    <div class="sellpoint-selector__feedback">
      <label class="sellpoint-selector__feedback-label">补充反馈</label>
      <a-textarea
        data-testid="feedback-input"
        :value="localFeedback"
        :placeholder="feedbackPlaceholder"
        :rows="3"
        @update:value="onFeedbackInput"
      />
      <a-button
        data-testid="regenerate-sellpoints-btn"
        :disabled="loading"
        @click="onRegenerate"
      >
        重新生成卖点方案
      </a-button>
    </div>

    <a-button
      v-if="selectedIndex >= 0"
      type="primary"
      block
      data-testid="generate-summary-btn"
      @click="$emit('generate-summary', selectedIndex)"
    >
      选定方案，生成简介
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import MarketAnalysisCard from './MarketAnalysisCard.vue';
import type { SellPoint } from './MarketAnalysisCard.vue';

const props = defineProps<{
  sellPoints: SellPoint[];
  selectedIndex: number;
  loading: boolean;
  feedback?: string;
  feedbackPlaceholder?: string;
}>();

const emit = defineEmits<{
  select: [index: number];
  'update:feedback': [value: string];
  regenerate: [feedback: string];
  'generate-summary': [index: number];
}>();

const localFeedback = ref(props.feedback ?? '');

watch(() => props.feedback, (val) => {
  localFeedback.value = val ?? '';
});

function onFeedbackInput(val: string) {
  localFeedback.value = val;
  emit('update:feedback', val);
}

function onRegenerate() {
  emit('regenerate', localFeedback.value);
}
</script>

<style scoped>
.sellpoint-selector {
  padding: 24px;
}

.sellpoint-selector__title {
  font-size: var(--font-size-heading);
  color: var(--color-text-primary);
  margin: 0 0 16px 0;
}

.sellpoint-selector__loading {
  text-align: center;
  padding: 40px;
}

.sellpoint-selector__empty-warning {
  margin-bottom: 16px;
}

.sellpoint-selector__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sellpoint-selector__feedback {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.sellpoint-selector__feedback-label {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
}
</style>
