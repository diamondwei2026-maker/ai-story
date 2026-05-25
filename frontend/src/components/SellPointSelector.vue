<template>
  <div data-testid="sellpoint-selector" class="sellpoint-selector">
    <h3 data-testid="sellpoint-section-title" class="sellpoint-selector__title">
      选择核心卖点方案
    </h3>

    <div v-if="loading" data-testid="sellpoint-loading" class="sellpoint-selector__loading">
      卖点方案生成中...
    </div>

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
      <textarea
        data-testid="feedback-input"
        class="sellpoint-selector__feedback-input"
        :placeholder="feedbackPlaceholder"
        :value="localFeedback"
        @input="onFeedbackInput"
      />
      <button
        data-testid="regenerate-sellpoints-btn"
        class="sellpoint-selector__regenerate-btn"
        :disabled="loading"
        @click="onRegenerate"
      >
        不满意？反馈并重新生成
      </button>
    </div>

    <button
      v-if="selectedIndex >= 0"
      data-testid="generate-summary-btn"
      class="sellpoint-selector__summary-btn"
      @click="$emit('generate-summary', selectedIndex)"
    >
      选定方案，生成简介
    </button>
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

function onFeedbackInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value;
  localFeedback.value = val;
  emit('update:feedback', val);
}

function onRegenerate() {
  emit('regenerate', localFeedback.value);
}
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.sellpoint-selector {
  padding: 24px;
}

.sellpoint-selector__title {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 16px 0;
}

.sellpoint-selector__loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
  font-size: 15px;
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
  border-top: 1px solid var(--color-border-light);
}

.sellpoint-selector__feedback-input {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  resize: vertical;
}

.sellpoint-selector__feedback-input:focus {
  outline: none;
  border-color: var(--color-gold);
}

.sellpoint-selector__regenerate-btn {
  align-self: flex-start;
  padding: 8px 20px;
  border: 1px solid var(--color-gold);
  border-radius: 8px;
  background: transparent;
  color: var(--color-gold);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.sellpoint-selector__regenerate-btn:hover:not(:disabled) {
  background-color: rgba(212, 175, 55, 0.1);
}

.sellpoint-selector__regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sellpoint-selector__summary-btn {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: var(--color-gold);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.sellpoint-selector__summary-btn:hover {
  opacity: 0.9;
}
</style>
