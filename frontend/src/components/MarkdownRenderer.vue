<template>
  <div
    v-if="html"
    class="markdown-renderer"
    data-testid="markdown-renderer"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/composables/useMarkdown';

const props = withDefaults(defineProps<{
  content?: string;
  /** When true, render as plain text with pre-wrap (for streaming) */
  plain?: boolean;
}>(), {
  content: '',
  plain: false,
});

const html = computed(() => {
  if (props.plain || !props.content) return '';
  return renderMarkdown(props.content);
});
</script>

<style scoped>
.markdown-renderer {
  font-family: var(--font-serif);
  font-size: var(--font-size-body);
  line-height: 1.9;
  color: var(--color-ink);
}

.markdown-renderer :deep(h2) {
  font-size: var(--font-size-section);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 24px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.markdown-renderer :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 20px 0 6px 0;
}

.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 16px 0 4px 0;
}

.markdown-renderer :deep(p) {
  margin: 0 0 12px 0;
}

.markdown-renderer :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-renderer :deep(strong) {
  font-weight: 700;
  color: var(--color-text-primary);
}

.markdown-renderer :deep(em) {
  font-style: italic;
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin: 8px 0 12px 0;
  padding-left: 24px;
}

.markdown-renderer :deep(li) {
  margin-bottom: 4px;
}

.markdown-renderer :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--color-primary);
  background: var(--color-primary-bg);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.markdown-renderer :deep(blockquote p) {
  margin: 0;
  color: var(--color-text-secondary);
}

.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-rule);
  margin: 16px 0;
}
</style>
