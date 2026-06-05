<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  defaultWordCount: number;
  isConfirmed: boolean;
  outlineText?: string;
}>(), { outlineText: '' });

const emit = defineEmits<{
  'start-generation': [opts: { targetChapterCount: number; defaultWordCount: number }];
  'update:wordCount': [value: number];
}>();

// Volume presets
const volumeOptions = [
  { value: 15, label: '短篇' },
  { value: 25, label: '中篇' },
  { value: 40, label: '长篇' },
];
const targetChapterCount = ref(25);

const wordCountOptions = [
  { value: 2000, label: '2000字' },
  { value: 3000, label: '3000字' },
  { value: 4000, label: '4000字' },
  { value: 5000, label: '5000字' },
];
const localWordCount = ref(props.defaultWordCount);

function handleStartGeneration() {
  emit('update:wordCount', localWordCount.value);
  emit('start-generation', {
    targetChapterCount: targetChapterCount.value,
    defaultWordCount: localWordCount.value,
  });
}

const outlinePreview = computed(() => {
  if (!props.outlineText) return '';
  // Extract first 300 chars for preview
  return props.outlineText.length > 300
    ? props.outlineText.substring(0, 300) + '...'
    : props.outlineText;
});
</script>

<template>
  <a-card data-testid="beats-config-panel" title="细纲生成配置" size="small" class="config-panel">
    <template v-if="isConfirmed">
      <a-tag data-testid="config-confirmed-label" color="green">已确认</a-tag>
      <span class="config-confirmed-text">细纲已确认，进入正文创作阶段</span>
    </template>

    <template v-else>
      <!-- Volume preset -->
      <div class="config-field">
        <span class="config-label">篇幅预设</span>
        <a-segmented
          v-model:value="targetChapterCount"
          :options="volumeOptions"
          data-testid="config-volume-segmented"
        />
        <span class="config-hint">约{{ targetChapterCount }}章（可浮动10%）</span>
      </div>

      <!-- Word count -->
      <div class="config-field">
        <span class="config-label">每章字数</span>
        <a-segmented
          v-model:value="localWordCount"
          :options="wordCountOptions"
          data-testid="config-wordcount-segmented"
        />
      </div>

      <!-- Outline preview -->
      <a-collapse v-if="outlineText" :bordered="false" class="config-collapse">
        <a-collapse-panel key="outline" header="大纲预览">
          <p data-testid="config-outline-preview" class="outline-preview">{{ outlinePreview }}</p>
        </a-collapse-panel>
      </a-collapse>

      <div class="config-action">
        <a-button
          type="primary"
          size="large"
          data-testid="config-start-generation-btn"
          class="amber-btn"
          @click="handleStartGeneration"
        >
          开始拆解
        </a-button>
      </div>
    </template>
  </a-card>
</template>

<style scoped>
.config-panel { margin-bottom: var(--space-md); }
.config-field { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap; }
.config-label { font-size: 13px; color: var(--color-text-secondary); min-width: 70px; flex-shrink: 0; }
.config-hint { font-size: 11px; color: var(--color-text-secondary); }
.config-collapse { margin-bottom: var(--space-md); }
.outline-preview { font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap; margin: 0; }
.config-action { text-align: center; padding-top: var(--space-sm); }
.config-confirmed-text { font-size: 13px; color: var(--color-text-secondary); margin-left: var(--space-sm); }
</style>
