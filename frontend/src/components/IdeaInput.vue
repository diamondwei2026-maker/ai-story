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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  resize: vertical;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.idea-input__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
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
