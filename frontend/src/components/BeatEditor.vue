<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

const props = defineProps<{ beat: Beat }>();
const emit = defineEmits<{
  'save-wordcount': [wordCount: number];
  'save-structure': [plan: Record<string, unknown>];
}>();

const mode = ref<'wordcount' | 'structure'>('wordcount');
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

const hookDensityLabel = computed(() => {
  return props.beat.hookCount >= 3 ? '高密度' : '正常';
});

function switchMode(newMode: 'wordcount' | 'structure') {
  mode.value = newMode;
}

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
      <span
        v-if="beat.useR1"
        data-testid="beat-editor-r1-badge"
        class="r1-badge"
      >
        R1
      </span>
    </div>

    <div class="mode-tabs">
      <button
        data-testid="mode-wordcount-tab"
        class="mode-tab"
        :class="{ active: mode === 'wordcount' }"
        @click="switchMode('wordcount')"
      >
        字数修改
      </button>
      <button
        data-testid="mode-structure-tab"
        class="mode-tab"
        :class="{ active: mode === 'structure' }"
        @click="switchMode('structure')"
      >
        结构调整
      </button>
    </div>

    <div
      data-testid="beat-hook-count-display"
      class="hook-density"
      :class="{ 'hook-high': beat.hookCount >= 3 }"
    >
      钩子密度: {{ beat.hookCount }} ({{ hookDensityLabel }})
    </div>

    <label class="checkbox-label climax-row">
      <input
        data-testid="beat-is-climax"
        v-model="editIsClimax"
        type="checkbox"
      />
      标记为高潮章节 (isClimax)
    </label>

    <div v-if="mode === 'wordcount'" class="editor-section">
      <label>目标字数</label>
      <input
        data-testid="beat-wordcount-input"
        v-model.number="editWordCount"
        type="number"
        min="500"
        max="50000"
        class="editor-input"
      />
      <button
        data-testid="beat-wordcount-save"
        class="save-btn"
        @click="handleSaveWordCount"
      >
        保存字数
      </button>
    </div>

    <div v-if="mode === 'structure'" data-testid="beat-structure-input" class="editor-section">
      <label>冲突点</label>
      <input
        data-testid="beat-conflict-input"
        v-model="editConflict"
        type="text"
        class="editor-input"
      />

      <label>钩子预设（逗号分隔）</label>
      <input
        data-testid="beat-hooks-input"
        v-model="editHooks"
        type="text"
        class="editor-input"
      />

      <button
        data-testid="beat-structure-save"
        class="save-btn"
        @click="handleSaveStructure"
      >
        保存结构
      </button>
    </div>
  </div>
</template>

<style scoped>
.beat-editor {
  padding: 16px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  background: #fff;
}
.beat-editor-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.r1-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: #e8eaf6;
  color: #283593;
  font-weight: 600;
}
.mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--color-border-light);
}
.mode-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}
.mode-tab.active {
  color: var(--color-gold-dark);
  border-bottom-color: var(--color-gold);
  font-weight: 600;
}
.hook-density {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  display: inline-block;
}
.hook-density.hook-high {
  color: var(--color-gold-dark);
  background: #fff8e1;
  font-weight: 600;
}
.climax-row {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.editor-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.editor-input {
  padding: 8px 10px;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text-primary);
}
.editor-input:focus {
  border-color: var(--color-gold);
  outline: none;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.save-btn {
  margin-top: 4px;
  padding: 8px 20px;
  background: var(--color-gold);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}
.save-btn:hover {
  background: var(--color-gold-dark);
}
</style>
