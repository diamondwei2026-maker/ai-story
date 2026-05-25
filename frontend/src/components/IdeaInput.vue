<template>
  <div data-testid="idea-input" class="idea-input">
    <h3 data-testid="idea-input-title" class="idea-input__title">输入你的创意灵感</h3>
    <textarea
      data-testid="idea-textarea"
      class="idea-input__textarea"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder || defaultPlaceholder"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span data-testid="idea-char-count" class="idea-input__char-count">
      {{ modelValue.length }} 字
    </span>
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
@import url('@/styles/css-variables.css');

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

.idea-input__textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  resize: vertical;
  transition: border-color 0.3s;
}

.idea-input__textarea:focus {
  outline: none;
  border-color: var(--color-gold);
}

.idea-input__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.idea-input__char-count {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
}
</style>
