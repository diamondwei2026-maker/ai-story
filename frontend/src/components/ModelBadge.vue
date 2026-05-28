<template>
  <a-tag
    data-testid="model-badge"
    :color="degraded ? 'warning' : 'success'"
  >
    <template v-if="degraded">
      已降级至 {{ modelName }}
    </template>
    <template v-else>
      {{ modelName }}
    </template>
  </a-tag>
</template>

<script setup lang="ts">
defineProps<{
  modelName: string;
  degraded: boolean;
}>();
</script>
