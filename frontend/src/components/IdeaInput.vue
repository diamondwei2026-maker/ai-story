<template>
  <div data-testid="idea-input" class="idea-input">
    <h3 data-testid="idea-input-title" class="idea-input__title">输入你的创意灵感</h3>
    <a-textarea
      data-testid="idea-textarea"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder || defaultPlaceholder"
      :rows="5"
      show-count
      @update:value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  disabled: boolean;
  placeholder?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();

const defaultPlaceholder = '输入你的小说创意，例如：一个医生重生到星际时代的故事...';
</script>

<style scoped>
.idea-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
}

.idea-input__title {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}
</style>
