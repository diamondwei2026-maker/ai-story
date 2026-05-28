<template>
  <div data-testid="setting-view" class="setting-view">
    <h2 data-testid="setting-title" class="setting-view__title">设定集</h2>

    <a-alert
      v-if="reviewAnnotations"
      data-testid="review-annotations"
      type="warning"
      :message="reviewAnnotations"
      banner
      show-icon
    />

    <!-- Loading -->
    <div v-if="loading" data-testid="setting-loading" class="setting-view__loading">
      <a-spin tip="设定生成中，请稍候..." />
    </div>

    <!-- Error -->
    <a-alert
      v-if="error"
      data-testid="setting-error"
      type="error"
      :message="error"
      closable
      @close="error = null"
      class="setting-view__error"
    >
      <template #action>
        <a-button
          data-testid="setting-retry-btn"
          size="small"
          @click="handleGenerate"
        >
          重试
        </a-button>
      </template>
    </a-alert>

    <!-- Generate button (when no setting and not loading) -->
    <div
      v-if="!settingData && !loading"
      class="setting-view__empty"
    >
      <p class="setting-view__empty-text">点击生成按钮，AI 将基于灵感创建设定集</p>
      <a-button
        type="primary"
        data-testid="generate-setting-btn"
        :loading="loading"
        @click="handleGenerate"
      >
        生成设定
      </a-button>
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
        <a-button
          data-testid="regenerate-setting-btn"
          :loading="regenerating"
          @click="handleRegenerate"
        >
          {{ regenerating ? '刷新中...' : '刷新关联内容' }}
        </a-button>
        <a-button
          danger
          data-testid="reject-setting-btn"
          @click="handleReject"
        >
          驳回，重新生成
        </a-button>
        <a-button
          type="primary"
          data-testid="confirm-setting-btn"
          class="amber-btn"
          @click="handleConfirm"
        >
          确认设定，进入大纲阶段
        </a-button>
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

.setting-view__loading {
  text-align: center;
  padding: 32px;
}

.setting-view__error {
  margin-bottom: 16px;
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

.setting-view__actions {
  text-align: center;
  padding: 24px 0;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
