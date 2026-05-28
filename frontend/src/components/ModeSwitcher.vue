<template>
  <div class="mode-switcher" data-testid="mode-switcher">
    <a-radio-group
      :value="mode"
      button-style="solid"
      @update:value="$emit('update:mode', $event as string)"
    >
      <a-radio-button
        v-for="option in modes"
        :key="option.value"
        :value="option.value"
        data-testid="mode-option"
        @click="$emit('update:mode', option.value)"
      >
        {{ option.label }}
      </a-radio-button>
    </a-radio-group>
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
