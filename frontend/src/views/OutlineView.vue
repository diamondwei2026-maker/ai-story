<template>
  <div data-testid="outline-view" class="outline-view">
    <h2 data-testid="outline-title" class="outline-view__title">剧情大纲</h2>

    <a-alert
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      type="warning"
      :message="reviewAnnotations"
      banner
      show-icon
    />

    <!-- Loading -->
    <div v-if="loading" data-testid="outline-loading" class="outline-view__loading">
      <a-spin tip="大纲生成中，请稍候..." />
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="outline-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="outline-view__error"
    >
      <template #action>
        <a-button
          data-testid="outline-retry-btn"
          size="small"
          @click="handleGenerate"
        >
          重试
        </a-button>
      </template>
    </a-alert>

    <!-- Generate button (when no outline and not loading) -->
    <div
      v-if="!outlineData && !loading"
      class="outline-view__empty"
    >
      <p class="outline-view__empty-text">选择叙事结构，点击生成按钮，AI 将基于设定构建剧情大纲</p>
      <div
        v-if="!isConfirmed"
        data-testid="structure-switcher"
        class="outline-view__structure-select"
      >
        <span class="outline-view__structure-select-label">叙事结构：</span>
        <a-select
          v-model:value="selectedStructure"
          :options="structureOptions"
          style="width: 200px"
        />
      </div>
      <a-button
        type="primary"
        data-testid="generate-outline-btn"
        :loading="loading"
        @click="handleGenerate"
      >
        生成大纲
      </a-button>
    </div>

    <!-- Outline content -->
    <template v-if="outlineData && !loading">
      <div
        v-if="!isConfirmed"
        data-testid="structure-switcher"
        class="outline-view__structure-select"
      >
        <span class="outline-view__structure-select-label">叙事结构：</span>
        <a-select
          v-model:value="selectedStructure"
          :options="structureOptions"
          style="width: 200px"
          @change="handleSwitchStructure"
        />
      </div>
      <div data-testid="outline-tree" class="outline-view__tree">
        <pre>{{ outlineData.output }}</pre>
      </div>
      <div data-testid="emotion-curve" class="outline-view__emotion">
        <a-tag
          v-for="label in emotionLabels"
          :key="label"
          color="blue"
        >
          {{ label }}
        </a-tag>
      </div>

      <div
        v-if="!isConfirmed"
        class="outline-view__actions"
      >
        <a-button
          data-testid="regenerate-outline-btn"
          :loading="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </a-button>
        <a-button
          danger
          data-testid="reject-outline-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </a-button>
        <a-button
          type="primary"
          data-testid="confirm-outline-btn"
          class="amber-btn"
          @click="handleConfirm"
        >
          确认大纲，进入分节阶段
        </a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import {
  generateOutline,
  confirmOutline,
  rejectOutline,
  getOutline,
  switchStructure,
} from '@/api/outline';
import type { StepDataResponse } from '@/api/common';

const props = defineProps<{
  projectId: string;
}>();

const selectedStructure = ref('three-act');

const structureOptions = [
  { value: 'three-act', label: '三幕式' },
  { value: 'web-novel-ten', label: '网文十章' },
  { value: 'four-act-eight', label: '四幕八段' },
];

const {
  data: outlineData,
  loading,
  regenerating,
  error,
  isConfirmed,
  reviewAnnotations,
  handleGenerate,
  handleRegenerate,
  handleConfirm,
  handleReject,
} = usePhaseWorkflow<StepDataResponse>({
  projectId: props.projectId,
  phase: 'OUTLINE',
  nextPhase: 'BEATS',
  getFn: getOutline,
  generateFn: generateOutline,
  confirmFn: confirmOutline,
  rejectFn: rejectOutline,
  generateArgs: () => ({ setting: '', structure: selectedStructure.value }),
});

const emotionLabels = computed(() => {
  const output = outlineData.value?.output ?? '';
  const labels: string[] = [];
  if (/\[爽点\]/.test(output)) labels.push('爽点');
  if (/\[虐点\]/.test(output)) labels.push('虐点');
  if (/\[悬念点\]/.test(output)) labels.push('悬念点');
  return labels;
});

async function handleSwitchStructure() {
  if (
    !confirm('切换叙事结构将重新组织大纲，关键情节点保留但节点间衔接将被重写。确定继续吗？')
  ) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await switchStructure(props.projectId, selectedStructure.value);
    outlineData.value = result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '切换结构失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.outline-view {
  padding: 16px 0;
}

.outline-view__title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.outline-view__loading {
  text-align: center;
  padding: 32px;
}

.outline-view__error {
  margin-bottom: 16px;
}

.outline-view__empty {
  text-align: center;
  padding: 48px 16px;
}

.outline-view__empty-text {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.outline-view__structure-select {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.outline-view__structure-select-label {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.outline-view__tree {
  background-color: var(--color-bg-secondary);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
}

.outline-view__tree pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

.outline-view__emotion {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}

.outline-view__actions {
  text-align: center;
  padding: 24px 0;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
