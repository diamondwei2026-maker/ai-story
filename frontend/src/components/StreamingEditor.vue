<template>
  <div class="streaming-editor" data-testid="streaming-editor">
    <div
      v-if="!content"
      data-testid="editor-placeholder"
      class="editor-placeholder"
    >
      点击生成按钮开始创作...
    </div>

    <div
      v-if="content && isStreaming"
      data-testid="streaming-indicator"
      class="streaming-indicator"
    >
      正在生成中...
    </div>

    <div
      data-testid="editor-content"
      :class="['editor-content', { 'typewriter-active': isStreaming }]"
    >
      {{ content }}
    </div>

    <textarea
      v-if="content"
      data-testid="editor-textarea"
      :value="content"
      :readonly="!isEditable"
      class="editor-textarea"
      @input="$emit('update:content', ($event.target as HTMLTextAreaElement).value)"
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
