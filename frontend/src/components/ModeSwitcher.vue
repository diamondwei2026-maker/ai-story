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
