<template>
  <div data-testid="summary-card" class="summary-card">
    <h3 class="summary-card__title">小说简介</h3>

    <div v-if="loading" data-testid="summary-loading" class="summary-card__loading">
      简介生成中...
    </div>

    <div v-else-if="!oneLiner && !fullSummary" data-testid="summary-empty" class="summary-card__empty">
      尚未生成简介
    </div>

    <template v-else>
      <div class="summary-card__section">
        <span data-testid="one-liner-label" class="summary-card__label">一句话简介</span>
        <p data-testid="one-liner" class="summary-card__oneliner">{{ oneLiner }}</p>
      </div>

      <div class="summary-card__section">
        <span data-testid="full-summary-label" class="summary-card__label">500字简介</span>
        <p data-testid="full-summary" class="summary-card__full">{{ fullSummary }}</p>
      </div>

      <div v-if="editable" class="summary-card__section">
        <span class="summary-card__label">自定义一句话简介 (可选)</span>
        <textarea
          data-testid="custom-brief-input"
          class="summary-card__custom-input"
          :value="customBrief"
          :placeholder="customBriefPlaceholder"
          @input="$emit('update:customBrief', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  oneLiner: string;
  fullSummary: string;
  loading: boolean;
  editable?: boolean;
  customBrief?: string;
  customBriefPlaceholder?: string;
}>();

defineEmits<{
  'update:customBrief': [value: string];
}>();
</script>

<style scoped>

.summary-card {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.summary-card__title {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 16px 0;
}

.summary-card__loading,
.summary-card__empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.summary-card__section {
  margin-bottom: 20px;
}

.summary-card__section:last-child {
  margin-bottom: 0;
}

.summary-card__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-card__oneliner {
  font-size: 15px;
  color: var(--color-primary);
  font-weight: 500;
  margin: 0;
  line-height: 1.6;
}

.summary-card__full {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
}

.summary-card__custom-input {
  width: 100%;
  min-height: 50px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  resize: vertical;
  margin-top: 6px;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.summary-card__custom-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
</style>
