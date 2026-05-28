<template>
  <div data-testid="idea-input" class="idea-input">
    <h3 data-testid="idea-input-title" class="idea-input__title subsection-title">输入你的创意灵感</h3>
    <a-textarea
      data-testid="idea-textarea"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder || defaultPlaceholder"
      :rows="8"
      show-count
      :maxlength="2000"
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

const defaultPlaceholder = '描述你的故事创意，例如：一个重生到星际时代的医生...';
</script>

<style scoped>
.idea-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.idea-input__title {
  margin: 0 0 var(--space-sm) 0;
}
</style>
