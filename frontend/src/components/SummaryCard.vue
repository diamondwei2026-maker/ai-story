<template>
  <a-card data-testid="summary-card" title="小说简介">
    <template #extra>
      <a-button
        v-if="oneLiner || fullSummary"
        size="small"
        @click="copySummary"
      >
        {{ copied ? '已复制!' : '复制' }}
      </a-button>
    </template>

    <div v-if="loading" data-testid="summary-loading" class="summary-card__loading">
      <a-spin tip="简介生成中..." />
    </div>

    <div v-else-if="!oneLiner && !fullSummary" data-testid="summary-empty" class="summary-card__empty">
      尚未生成简介
    </div>

    <template v-else>
      <div class="summary-card__section">
        <span data-testid="one-liner-label" class="summary-card__label">一句话简介</span>
        <blockquote data-testid="one-liner" class="summary-card__oneliner serif-accent">
          {{ oneLiner }}
        </blockquote>
      </div>

      <a-divider />

      <div class="summary-card__section">
        <span data-testid="full-summary-label" class="summary-card__label">500字简介</span>
        <MarkdownRenderer
          data-testid="full-summary"
          :content="fullSummary"
        />
      </div>

      <div v-if="editable" class="summary-card__section">
        <span class="summary-card__label">自定义一句话简介 (可选)</span>
        <a-textarea
          data-testid="custom-brief-input"
          :value="customBrief"
          :placeholder="customBriefPlaceholder"
          :rows="2"
          @update:value="$emit('update:customBrief', $event)"
        />
      </div>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { copyToClipboard } from '@/utils/clipboard';

const props = defineProps<{
  oneLiner: string;
  fullSummary: string;
  loading: boolean;
  editable?: boolean;
  customBrief?: string;
  customBriefPlaceholder?: string;
}>();

defineEmits<{
  'update:customBrief': [value: string];
}>();

const copied = ref(false);

async function copySummary() {
  const text = [props.oneLiner, props.fullSummary].filter(Boolean).join('\n\n');
  try {
    await copyToClipboard(text);
    copied.value = true;
    message.success('已复制到剪贴板');
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    message.error('复制失败');
  }
}
</script>

<style scoped>
.summary-card__loading,
.summary-card__empty {
  text-align: center;
  padding: var(--space-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
}

.summary-card__section {
  margin-bottom: var(--space-lg);
}

.summary-card__section:last-child {
  margin-bottom: 0;
}

.summary-card__label {
  display: block;
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-card__oneliner {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--color-primary-dark);
  font-weight: 600;
  margin: 0;
  line-height: 1.7;
  padding-left: 16px;
  border-left: 3px solid var(--color-primary);
}

.summary-card__full {
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.9;
  white-space: pre-wrap;
}
</style>
