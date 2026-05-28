<template>
  <div class="streaming-editor" data-testid="streaming-editor">
    <a-empty
      v-if="!content"
      data-testid="editor-placeholder"
      description="点击生成按钮开始创作..."
    />

    <a-spin
      v-if="content && isStreaming"
      data-testid="streaming-indicator"
      tip="正在生成中..."
      :spinning="true"
    />

    <div
      data-testid="editor-content"
      :class="['editor-content', { 'typewriter-active': isStreaming }]"
    >
      {{ content }}
    </div>

    <a-textarea
      v-if="content"
      data-testid="editor-textarea"
      :value="content"
      :readonly="!isEditable"
      @update:value="$emit('update:content', $event)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  content: string;
  isStreaming: boolean;
  isEditable: boolean;
}>();

defineEmits<{
  'update:content': [value: string];
}>();
</script>
