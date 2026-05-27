<template>
  <span
    data-testid="model-badge"
    class="model-badge"
    :class="{ 'badge--degraded': degraded }"
  >
    <template v-if="degraded">
      已降级至 {{ modelName }}
    </template>
    <template v-else>
      {{ modelName }}
    </template>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  modelName: string;
  degraded: boolean;
}>();
</script>

<style scoped>
.model-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: var(--color-success-light);
  color: #065f46;
  border: 1px solid var(--color-success);
}

.badge--degraded {
  background-color: var(--color-warning-light);
  color: #92400e;
  border: 1px solid var(--color-warning);
}
</style>
