<template>
  <div data-testid="setting-view" class="setting-view">
    <h2 data-testid="setting-title" class="setting-view__title">设定集</h2>

    <div
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      class="setting-view__review-banner"
    >
      {{ reviewAnnotations }}
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="setting-loading" class="setting-view__loading">
      设定生成中，请稍候...
    </div>

    <!-- Error -->
    <div v-if="error" data-testid="setting-error" class="setting-view__error">
      <p>{{ error }}</p>
      <button
        data-testid="setting-retry-btn"
        class="setting-view__retry-btn"
        @click="handleGenerate"
      >
        重试
      </button>
    </div>

    <!-- Generate button (when no setting and not loading) -->
    <div
      v-if="!settingData && !loading"
      class="setting-view__empty"
    >
      <p class="setting-view__empty-text">点击生成按钮，AI 将基于灵感创建设定集</p>
      <button
        data-testid="generate-setting-btn"
        class="setting-view__generate-btn"
        :disabled="loading"
        @click="handleGenerate"
      >
        生成设定
      </button>
    </div>

    <!-- Setting content -->
    <template v-if="settingData && !loading">
      <WorldBuilder :content="settingData.output" />
      <CharacterCard :content="settingData.output" />
      <RelationGraph :content="settingData.output" />

      <div
        v-if="!isConfirmed"
        class="setting-view__actions"
      >
        <button
          data-testid="regenerate-setting-btn"
          class="setting-view__regenerate-btn"
          :disabled="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </button>
        <button
          data-testid="reject-setting-btn"
          class="setting-view__reject-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </button>
        <button
          data-testid="confirm-setting-btn"
          class="setting-view__confirm-btn"
          @click="handleConfirm"
        >
          确认设定，进入大纲阶段
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import { generateSetting, confirmSetting, rejectSetting, getSetting } from '@/api/setting';
import type { StepDataResponse } from '@/api/common';
import WorldBuilder from '@/components/WorldBuilder.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import RelationGraph from '@/components/RelationGraph.vue';

const props = defineProps<{
  projectId: string;
}>();

const {
  data: settingData,
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
  phase: 'SETTING',
  nextPhase: 'OUTLINE',
  getFn: getSetting,
  generateFn: generateSetting,
  confirmFn: confirmSetting,
  rejectFn: rejectSetting,
  generateArgs: () => ({ idea: '' }),
});
</script>

<style scoped>
.setting-view {
  padding: 16px 0;
}

.setting-view__title {
  font-size: 20px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.setting-view__review-banner {
  background-color: var(--color-accent-light);
  color: var(--color-accent-dark);
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-bottom: 16px;
  border-left: 3px solid var(--color-accent);
}

.setting-view__loading {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.setting-view__error {
  background-color: var(--color-error-light);
  color: var(--color-error);
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: center;
  margin-bottom: 16px;
}

.setting-view__retry-btn {
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

.setting-view__retry-btn:hover {
  opacity: 0.9;
}

.setting-view__empty {
  text-align: center;
  padding: 48px 16px;
}

.setting-view__empty-text {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.setting-view__generate-btn {
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

.setting-view__generate-btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.setting-view__generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.setting-view__actions {
  text-align: center;
  padding: 24px 0;
}

.setting-view__regenerate-btn {
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

.setting-view__regenerate-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
}

.setting-view__regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-view__reject-btn {
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

.setting-view__reject-btn:hover {
  background: var(--color-error);
  color: #fff;
}

.setting-view__confirm-btn {
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

.setting-view__confirm-btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
</style>
