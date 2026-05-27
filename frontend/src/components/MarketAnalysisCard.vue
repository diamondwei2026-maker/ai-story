<template>
  <div
    data-testid="market-analysis-card"
    class="market-card"
    :class="{ 'card--selected': selected }"
    @click="$emit('select')"
  >
    <h4 data-testid="sellpoint-title" class="market-card__title">{{ sellPoint.title }}</h4>
    <p class="market-card__sellpoint">{{ sellPoint.coreSellPoint }}</p>

    <div class="market-card__metrics">
      <span data-testid="market-score" class="market-card__score">
        市场匹配度: {{ sellPoint.marketScore }}/10
      </span>
    </div>

    <div data-testid="hit-references" class="market-card__references">
      <span class="market-card__ref-label">爆款参考:</span>
      <span v-for="(ref, i) in sellPoint.hitReferences" :key="i" class="market-card__ref-tag">
        {{ ref }}
      </span>
    </div>

    <p data-testid="differentiation" class="market-card__diff">
      {{ sellPoint.differentiation }}
    </p>
  </div>
</template>

<script setup lang="ts">
export interface SellPoint {
  index: number;
  title: string;
  coreSellPoint: string;
  marketScore: number;
  hitReferences: string[];
  differentiation: string;
}

defineProps<{
  sellPoint: SellPoint;
  selected: boolean;
}>();

defineEmits<{
  select: [];
}>();
</script>

<style scoped>

.market-card {
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.market-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card--selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.market-card__title {
  font-size: 17px;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  font-weight: 700;
}

.market-card__sellpoint {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.market-card__metrics {
  margin-bottom: 10px;
}

.market-card__score {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

.market-card__references {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.market-card__ref-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.market-card__ref-tag {
  font-size: 12px;
  padding: 2px 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.market-card__diff {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>
