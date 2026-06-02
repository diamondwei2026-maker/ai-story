<template>
  <div class="streaming-editor" data-testid="streaming-editor">
    <!-- Empty State -->
    <div v-if="!content && !isStreaming" data-testid="editor-placeholder">
      <EmptyState
        description="点击生成按钮开始创作..."
      />
    </div>

    <!-- Streaming Indicator -->
    <div v-if="isStreaming" data-testid="streaming-indicator" class="streaming-editor__status">
      <a-spin size="small" />
      <span class="streaming-editor__status-text">AI 正在创作中</span>
      <span class="streaming-editor__cursor">|</span>
    </div>

    <!-- Content Display -->
    <div v-if="content" class="streaming-editor__content-wrapper">
      <div
        data-testid="editor-content"
        :class="['streaming-editor__content', { 'streaming-editor__content--active': isStreaming }]"
      >
        <MarkdownRenderer
          v-if="!isStreaming"
          :content="content"
        />
        <p v-else class="streaming-editor__text serif-accent">{{ content }}</p>
        <span v-if="isStreaming" class="streaming-editor__cursor streaming-editor__cursor--inline">|</span>
      </div>

      <!-- Toolbar -->
      <div class="streaming-editor__toolbar">
        <a-space>
          <a-button
            v-if="isEditable && !isStreaming"
            size="small"
            @click="editing = !editing"
          >
            {{ editing ? '预览' : '编辑' }}
          </a-button>
          <a-button
            v-if="content"
            size="small"
            @click="copyContent"
          >
            {{ copied ? '已复制!' : '复制' }}
          </a-button>
        </a-space>
      </div>

      <!-- Editable Textarea -->
      <a-textarea
        v-if="editing && isEditable && !isStreaming"
        data-testid="editor-textarea"
        :value="content"
        :rows="12"
        class="streaming-editor__textarea"
        @update:value="$emit('update:content', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import EmptyState from '@/components/EmptyState.vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

const props = defineProps<{
  content: string;
  isStreaming: boolean;
  isEditable: boolean;
}>();

defineEmits<{
  'update:content': [value: string];
}>();

const editing = ref(false);
const copied = ref(false);

defineExpose({ editing });

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;
    message.success('已复制到剪贴板');
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    message.error('复制失败');
  }
}
</script>

<style scoped>
.streaming-editor {
  padding: var(--space-md) 0;
}

.streaming-editor__status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.streaming-editor__status-text {
  font-style: italic;
}

.streaming-editor__content-wrapper {
  background: var(--color-surface-warm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.streaming-editor__content {
  position: relative;
}

.streaming-editor__text {
  font-family: var(--font-serif);
  font-size: var(--font-size-body);
  line-height: 1.9;
  color: var(--color-ink);
  white-space: pre-wrap;
  margin: 0;
}

.streaming-editor__cursor {
  color: var(--color-primary);
  font-weight: 300;
  animation: blink 1s step-end infinite;
}

.streaming-editor__cursor--inline {
  display: inline;
  font-size: var(--font-size-body);
  line-height: 1.9;
}

@keyframes blink {
  from, to { opacity: 1; }
  50% { opacity: 0; }
}

.streaming-editor__toolbar {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.streaming-editor__textarea {
  margin-top: var(--space-md);
}
</style>
