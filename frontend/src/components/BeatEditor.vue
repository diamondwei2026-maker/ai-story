<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beat: Beat }>();
const emit = defineEmits<{
  'save-wordcount': [wordCount: number];
  'save-structure': [plan: Record<string, unknown>];
}>();

const mode = ref<string>('wordcount');
const editWordCount = ref(props.beat.targetWordCount);
const editConflict = ref(
  (props.beat.plan.conflictPoint as string) ?? '',
);
const editHooks = ref(
  Array.isArray(props.beat.plan.hookPresets)
    ? (props.beat.plan.hookPresets as string[]).join(', ')
    : '',
);
const editIsClimax = ref(props.beat.isClimax);

const modeOptions = [
  { value: 'wordcount', label: '字数修改' },
  { value: 'structure', label: '结构调整' },
];

const hookDensityLabel = computed(() => {
  return props.beat.hookCount >= 3 ? '高密度' : '正常';
});

function handleSaveWordCount() {
  emit('save-wordcount', editWordCount.value);
}

function handleSaveStructure() {
  const hooks = editHooks.value
    .split(/[,，、]/)
    .map((h) => h.trim())
    .filter(Boolean);

  emit('save-structure', {
    conflictPoint: editConflict.value,
    hookPresets: hooks,
    isClimax: editIsClimax.value,
  });
}
</script>

<template>
  <div data-testid="beat-editor" class="beat-editor">
    <div data-testid="beat-editor-title" class="beat-editor-title">
      第{{ beat.chapterNumber }}章
      <a-tag
        v-if="beat.useR1"
        data-testid="beat-editor-r1-badge"
        color="blue"
        class="r1-badge"
      >
        R1
      </a-tag>
    </div>

    <div data-testid="beat-mode-segmented-wrapper">
      <a-segmented
        v-model:value="mode"
        :options="modeOptions"
        block
        class="beat-editor__mode"
      />
    </div>

    <div
      data-testid="beat-hook-count-display"
      class="hook-density"
    >
      <a-tag :color="beat.hookCount >= 3 ? 'orange' : 'default'">
        钩子密度: {{ beat.hookCount }} ({{ hookDensityLabel }})
      </a-tag>
    </div>

    <div data-testid="beat-is-climax">
      <a-checkbox
        v-model:checked="editIsClimax"
        class="climax-row"
      >
        标记为高潮章节
      </a-checkbox>
    </div>

    <div v-if="mode === 'wordcount'" class="editor-section">
      <label class="editor-label">目标字数</label>
      <div data-testid="beat-wordcount-input">
        <a-input-number
          v-model:value="editWordCount"
          :min="500"
          :max="50000"
          class="editor-input-block"
        />
      </div>
      <a-button
        data-testid="beat-wordcount-save"
        type="primary"
        @click="handleSaveWordCount"
      >
        保存字数
      </a-button>
    </div>

    <div v-if="mode === 'structure'" data-testid="beat-structure-input" class="editor-section">
      <label class="editor-label">冲突点</label>
      <div data-testid="beat-conflict-input">
        <a-input
          v-model:value="editConflict"
          class="editor-input-block"
        />
      </div>

      <label class="editor-label">钩子预设（逗号分隔）</label>
      <div data-testid="beat-hooks-input">
        <a-input
          v-model:value="editHooks"
          class="editor-input-block"
        />
      </div>

      <a-button
        data-testid="beat-structure-save"
        type="primary"
        @click="handleSaveStructure"
      >
        保存结构
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.beat-editor {
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.beat-editor-title {
  font-size: var(--font-size-section);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.r1-badge {
  font-size: 11px;
}

.beat-editor__mode {
  margin-bottom: var(--space-sm);
}

.hook-density {
  margin-bottom: var(--space-sm);
}

.climax-row {
  margin-bottom: var(--space-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.editor-input-block {
  width: 100%;
}
</style>
