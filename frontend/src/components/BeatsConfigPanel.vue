<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  defaultWordCount: number;
  isConfirmed: boolean;
}>(), {});

const emit = defineEmits<{
  'start-generation': [opts: { targetChapterCount: number; defaultWordCount: number }];
  'update:wordCount': [value: number];
}>();

const targetChapterCount = ref(25);
const localWordCount = ref(props.defaultWordCount);

function handleStartGeneration() {
  emit('update:wordCount', localWordCount.value);
  emit('start-generation', {
    targetChapterCount: targetChapterCount.value,
    defaultWordCount: localWordCount.value,
  });
}
</script>

<template>
  <div data-testid="beats-config-panel" class="config-panel">
    <template v-if="isConfirmed">
      <a-tag data-testid="config-confirmed-label" color="green">已确认</a-tag>
      <span class="config-confirmed-text">细纲已确认，进入正文创作阶段</span>
    </template>

    <template v-else>
      <div class="config-row">
        <div class="config-input-group">
          <label class="config-input__label">目标章节数</label>
          <input
            v-model.number="targetChapterCount"
            type="number"
            data-testid="config-chapter-input"
            class="config-input"
            :min="1"
            :max="120"
          />
        </div>
        <div class="config-input-group">
          <label class="config-input__label">默认每章字数</label>
          <input
            v-model.number="localWordCount"
            type="number"
            data-testid="config-wordcount-input"
            class="config-input"
            :min="500"
            :step="500"
          />
        </div>
        <button
          data-testid="config-start-generation-btn"
          class="config-submit"
          @click="handleStartGeneration"
        >
          ✧ 开始拆解
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.config-panel {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;
}

.config-row {
  display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
}
.config-input-group { display: flex; flex-direction: column; gap: 6px; }
.config-input__label { font-size: 13px; color: #4b5563; }
.config-input {
  border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 8px 12px; font-size: 14px; width: 112px; outline: none;
}
.config-input:focus { border-color: #9ca3af; box-shadow: 0 0 0 1px #9ca3af; }

.config-submit {
  display: flex; align-items: center; gap: 4px;
  padding: 9px 20px; border-radius: 8px;
  background: #111827; color: #fff; border: none;
  font-size: 14px; cursor: pointer; transition: background .15s;
  white-space: nowrap;
}
.config-submit:hover { background: #1f2937; }

.config-confirmed-text { font-size: 14px; color: #6b7280; margin-left: 8px; }
</style>
