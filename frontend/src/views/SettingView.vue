<template>
  <div data-testid="setting-view" class="setting-view">
    <h2 data-testid="setting-title" class="setting-view__title section-title">设定集</h2>

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
    <EmptyState
      v-if="!settingData && !loading"
      description="还没有设定，AI将基于已确认的灵感创建设定集"
    >
      <template #action>
        <a-button
          type="primary"
          data-testid="generate-setting-btn"
          :loading="loading"
          @click="handleGenerate"
        >
          生成设定
        </a-button>
      </template>
    </EmptyState>

    <!-- Setting content -->
    <template v-if="settingData && !loading">
      <a-tabs v-model:activeKey="activeTab" type="card" size="large" class="setting-view__tabs">
        <a-tab-pane key="world" tab="世界观">
          <WorldBuilder :content="settingData.output" />
        </a-tab-pane>
        <a-tab-pane key="characters" tab="角色">
          <CharacterCard :content="settingData.output" />
        </a-tab-pane>
        <a-tab-pane key="relationships" tab="关系">
          <RelationGraph :content="settingData.output" />
        </a-tab-pane>
      </a-tabs>

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
import { ref, watch, onMounted } from 'vue';
import { usePhaseWorkflow } from '@/composables/usePhaseWorkflow';
import { generateSetting, confirmSetting, rejectSetting, getSetting } from '@/api/setting';
import { getIdea } from '@/api/idea';
import type { StepDataResponse } from '@/api/common';
import WorldBuilder from '@/components/WorldBuilder.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import RelationGraph from '@/components/RelationGraph.vue';
import EmptyState from '@/components/EmptyState.vue';

const props = defineProps<{
  projectId: string;
}>();

const activeTab = ref('world');

/** 从 IDEA 阶段提取的已确认创意摘要，供设定生成使用 */
const ideaBasis = ref('');

/**
 * 从 IDEA 阶段的 output 中提取一句话简介 + 500字简介，
 * 这部分内容代表了用户已确认的故事核心创意。
 */
function extractIdeaBasis(output: string, review: Record<string, unknown> | null): string {
  // priority: review.oneLiner / review.fullSummary (独立存储)
  const rv = review as Record<string, unknown> | null;
  const oneLiner =
    (typeof rv?.oneLiner === 'string' && rv.oneLiner) ||
    (output.match(/#+ 一句话简介\n([\s\S]*?)(?=\n#+ |$)/)?.[1]?.trim()) ||
    '';
  const fullSummary =
    (typeof rv?.fullSummary === 'string' && rv.fullSummary) ||
    (output.split(/#+ 500字简介\n/)[1]?.trim()) ||
    '';
  return [oneLiner, fullSummary].filter(Boolean).join('\n\n');
}

const {
  data: settingData,
  loading,
  regenerating,
  error,
  isConfirmed,
  initialLoadDone,
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
  generateArgs: () => ({ idea: ideaBasis.value }),
});

// 加载 IDEA 阶段已确认的创意内容
const ideaLoaded = ref(false);
onMounted(async () => {
  try {
    const ideaData = await getIdea(props.projectId);
    if (ideaData) {
      ideaBasis.value = extractIdeaBasis(ideaData.output, ideaData.review as Record<string, unknown> | null);
    }
  } catch {
    // 静默忽略，最坏情况 idea 为空（回退兼容）
  } finally {
    ideaLoaded.value = true;
  }
});

// 待设定初始查询和 IDEA 数据都就绪后再自动生成
watch([initialLoadDone, ideaLoaded], ([settingDone, ideaDone]) => {
  if (settingDone && ideaDone && !settingData.value && !loading.value) {
    handleGenerate();
  }
});
</script>

<style scoped>
.setting-view {
  padding: var(--space-md) 0;
}

.setting-view__title {
  margin-bottom: var(--space-md);
}

.setting-view__loading {
  text-align: center;
  padding: var(--space-xl);
}

.setting-view__error {
  margin-bottom: var(--space-md);
}

.setting-view__tabs {
  margin-bottom: var(--space-lg);
}

.setting-view__actions {
  text-align: center;
  padding: var(--space-lg) 0;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
