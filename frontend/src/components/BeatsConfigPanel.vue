<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    defaultWordCount: number;
    chapterCount?: number;
    isConfirmed: boolean;
  }>(),
  {
    chapterCount: 0,
  },
);

const emit = defineEmits<{
  "update:wordCount": [value: number];
  regenerate: [];
}>();

const localWordCount = ref(props.defaultWordCount);

watch(
  () => props.defaultWordCount,
  (val) => {
    localWordCount.value = val;
  },
);

function handleWordCountChange(value: number | null) {
  if (value != null && value > 0) {
    emit("update:wordCount", value);
  }
}

function handleRegenerate() {
  if (!props.isConfirmed) {
    emit("regenerate");
  }
}

defineExpose({ handleWordCountChange });
</script>

<template>
  <a-card
    data-testid="beats-config-panel"
    title="细纲生成配置"
    size="small"
    class="beats-config-panel"
  >
    <template #extra>
      <a-tag
        v-if="isConfirmed"
        data-testid="config-confirmed-label"
        color="green"
      >已确认</a-tag>
    </template>

    <div class="config-body">
      <div class="config-field">
        <span class="config-label">默认章节字数</span>
        <a-input-number
          v-if="!isConfirmed"
          data-testid="config-wordcount-input"
          v-model:value="localWordCount"
          :min="500"
          :max="50000"
          :step="100"
          @change="handleWordCountChange"
        />
        <span
          v-else
          data-testid="config-wordcount-display"
          class="config-value-readonly"
        >{{ defaultWordCount }} 字</span>
      </div>

      <div v-if="chapterCount > 0" class="config-field">
        <span class="config-label">预计章节数</span>
        <span data-testid="config-chapter-count" class="config-value">
          {{ chapterCount }} 章
        </span>
        <span class="config-hint-text">（从大纲自动解析）</span>
      </div>

      <div
        v-if="!isConfirmed"
        data-testid="config-hint"
        class="config-hint"
      >
        修改字数后重新生成细纲，AI 将按新字数目标重新拆解各章节的节拍密度。
      </div>

      <a-button
        data-testid="config-regenerate-btn"
        :disabled="isConfirmed"
        @click="handleRegenerate"
      >
        重新生成细纲
      </a-button>
    </div>
  </a-card>
</template>

<style scoped>
.beats-config-panel {
  margin-bottom: var(--space-md);
}

.config-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.config-field {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.config-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 90px;
  flex-shrink: 0;
}

.config-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.config-value-readonly {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.config-hint-text {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.config-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: var(--space-sm);
  background: var(--color-surface-warm);
  border-radius: var(--radius-sm);
  line-height: 1.5;
}
</style>
