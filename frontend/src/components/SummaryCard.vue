<template>
  <a-card data-testid="summary-card" title="小说简介">
    <div v-if="loading" data-testid="summary-loading" class="summary-card__loading">
      <a-spin tip="简介生成中..." />
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
        <a-textarea
          data-testid="custom-brief-input"
          :value="customBrief"
          :placeholder="customBriefPlaceholder"
          :rows="2"
          @update:value="$emit('update:customBrief', $event)"
        />
      </div>
    </template>
  </a-card>
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
</style>
