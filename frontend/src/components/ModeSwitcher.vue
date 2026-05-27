<template>
  <div class="mode-switcher" data-testid="mode-switcher">
    <button
      v-for="option in modes"
      :key="option.value"
      :data-testid="'mode-option'"
      :class="['mode-option', { active: mode === option.value }]"
      @click="$emit('update:mode', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mode: string;
}>();

defineEmits<{
  'update:mode': [value: string];
}>();

const modes = [
  { value: 'new-continue', label: '新建续写' },
  { value: 'paragraph-rewrite', label: '段落改写' },
  { value: 'style-upgrade', label: '文笔升级' },
];
</script>

<style scoped>
.mode-switcher {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.mode-option {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-option:hover {
  color: var(--color-text-primary);
  background: var(--color-bg);
}

.mode-option.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}
</style>
