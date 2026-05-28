<template>
  <a-card
    hoverable
    data-testid="market-analysis-card"
    :class="{ 'card--selected': selected }"
    @click="$emit('select')"
  >
    <template #title>
      <span data-testid="sellpoint-title">{{ sellPoint.title }}</span>
    </template>
    <p class="market-card__sellpoint">{{ sellPoint.coreSellPoint }}</p>

    <div class="market-card__metrics">
      <a-tag data-testid="market-score" color="teal">
        市场匹配度: {{ sellPoint.marketScore }}/10
      </a-tag>
    </div>

    <div data-testid="hit-references" class="market-card__references">
      <span class="market-card__ref-label">爆款参考:</span>
      <a-tag v-for="(ref, i) in sellPoint.hitReferences" :key="i" class="market-card__ref-tag">
        {{ ref }}
      </a-tag>
    </div>

    <p data-testid="differentiation" class="market-card__diff">
      {{ sellPoint.differentiation }}
    </p>
  </a-card>
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
.market-card__sellpoint {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.market-card__metrics {
  margin-bottom: 10px;
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
}

.market-card__diff {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.card--selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}
</style>
