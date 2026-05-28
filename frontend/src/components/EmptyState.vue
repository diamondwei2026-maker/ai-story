<template>
  <div class="empty-state">
    <a-empty>
      <template #description>
        <span class="empty-state__text">{{ description }}</span>
      </template>
    </a-empty>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  description: string;
}>();
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.empty-state__text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.7;
}

.empty-state__action {
  margin-top: var(--space-lg);
}
</style>
