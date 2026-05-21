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
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.badge--degraded {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}
</style>
