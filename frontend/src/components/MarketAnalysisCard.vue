<template>
  <a-badge-ribbon :text="`方案 ${sellPoint.index + 1}`" color="teal">
    <a-card
      hoverable
      data-testid="market-analysis-card"
      :class="{ 'card--selected': selected }"
      @click="$emit('select')"
    >
      <template #title>
        <span data-testid="sellpoint-title">{{ sellPoint.title }}</span>
      </template>
      <p class="market-card__sellpoint body-text">{{ sellPoint.coreSellPoint }}</p>

      <div class="market-card__metrics">
        <span class="market-card__score-label caption">市场匹配度</span>
        <a-progress
          :percent="sellPoint.marketScore * 10"
          :show-info="true"
          :stroke-color="{ '0%': '#0d9488', '100%': '#f59e0b' }"
          size="small"
        />
      </div>

      <div data-testid="hit-references" class="market-card__references">
        <span class="market-card__ref-label caption">爆款参考:</span>
        <a-tag v-for="(ref, i) in sellPoint.hitReferences" :key="i" class="market-card__ref-tag">
          {{ ref }}
        </a-tag>
      </div>

      <p data-testid="differentiation" class="market-card__diff caption">
        {{ sellPoint.differentiation }}
      </p>
    </a-card>
  </a-badge-ribbon>
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
  margin: 0 0 12px 0;
  color: var(--color-text-primary);
}

.market-card__metrics {
  margin-bottom: 10px;
}

.market-card__score-label {
  display: block;
  margin-bottom: 4px;
}

.market-card__references {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.market-card__ref-label {
  color: var(--color-text-secondary);
}

.market-card__ref-tag {
  font-size: var(--font-size-caption);
}

.market-card__diff {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.card--selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}
</style>
