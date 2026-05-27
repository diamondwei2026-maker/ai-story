<template>
  <div data-testid="outline-view" class="outline-view">
    <h2 data-testid="outline-title" class="outline-view__title">剧情大纲</h2>

    <div
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      class="outline-view__review-banner"
    >
      {{ reviewAnnotations }}
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="outline-loading" class="outline-view__loading">
      大纲生成中，请稍候...
    </div>

    <!-- Error -->
    <div v-if="error" data-testid="outline-error" class="outline-view__error">
      <p>{{ error }}</p>
      <button
        data-testid="outline-retry-btn"
        class="outline-view__retry-btn"
        @click="handleGenerate"
      >
        重试
      </button>
    </div>

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
        <label>叙事结构：</label>
        <select v-model="selectedStructure">
          <option value="three-act">三幕式</option>
          <option value="web-novel-ten">网文十章</option>
          <option value="four-act-eight">四幕八段</option>
        </select>
      </div>
      <button
        data-testid="generate-outline-btn"
        class="outline-view__generate-btn"
        :disabled="loading"
        @click="handleGenerate"
      >
        生成大纲
      </button>
    </div>

    <!-- Outline content -->
    <template v-if="outlineData && !loading">
      <div
        v-if="!isConfirmed"
        data-testid="structure-switcher"
        class="outline-view__structure-select"
      >
        <label>叙事结构：</label>
        <select v-model="selectedStructure" @change="handleSwitchStructure">
          <option value="three-act">三幕式</option>
          <option value="web-novel-ten">网文十章</option>
          <option value="four-act-eight">四幕八段</option>
        </select>
      </div>
      <div data-testid="outline-tree" class="outline-view__tree">
        <pre>{{ outlineData.output }}</pre>
      </div>
      <div data-testid="emotion-curve" class="outline-view__emotion">
        <span
          v-for="label in emotionLabels"
          :key="label"
          class="outline-view__emotion-tag"
        >
          {{ label }}
        </span>
      </div>

      <div
        v-if="!isConfirmed"
        class="outline-view__actions"
      >
        <button
          data-testid="regenerate-outline-btn"
          class="outline-view__regenerate-btn"
          :disabled="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </button>
        <button
          data-testid="reject-outline-btn"
          class="outline-view__reject-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </button>
        <button
          data-testid="confirm-outline-btn"
          class="outline-view__confirm-btn"
          @click="handleConfirm"
        >
          确认大纲，进入分节阶段
        </button>
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

.outline-view__review-banner {
  background-color: var(--color-accent-light);
  color: var(--color-accent-dark);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-bottom: 16px;
  border-left: 3px solid var(--color-accent);
}

.outline-view__loading {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.outline-view__error {
  background-color: var(--color-error-light);
  color: var(--color-error);
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: center;
  margin-bottom: 16px;
}

.outline-view__retry-btn {
  margin-top: 8px;
  padding: 6px 20px;
  background-color: var(--color-error);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity var(--transition-fast);
}

.outline-view__retry-btn:hover {
  opacity: 0.9;
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
}

.outline-view__structure-select label {
  margin-right: 8px;
  color: var(--color-text-secondary);
}

.outline-view__structure-select select {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
}

.outline-view__generate-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.outline-view__generate-btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.outline-view__generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
}

.outline-view__emotion-tag {
  display: inline-block;
  padding: 2px 10px;
  margin-right: 8px;
  background-color: var(--color-info-light);
  color: var(--color-info);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.outline-view__actions {
  text-align: center;
  padding: 24px 0;
}

.outline-view__regenerate-btn {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  padding: 10px 32px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 16px;
  transition: all var(--transition-fast);
}

.outline-view__regenerate-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
}

.outline-view__regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.outline-view__reject-btn {
  background: transparent;
  color: var(--color-error);
  border: 1px solid var(--color-error);
  padding: 10px 32px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 16px;
  transition: all var(--transition-fast);
}

.outline-view__reject-btn:hover {
  background: var(--color-error);
  color: #fff;
}

.outline-view__confirm-btn {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark));
  color: #fff;
  border: none;
  padding: 10px 32px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.outline-view__confirm-btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
</style>
