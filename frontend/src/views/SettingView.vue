<template>
  <div data-testid="setting-view" class="setting-view">
    <!-- Stage Header -->
    <div class="setting-view__header">
      <div>
        <h2 data-testid="setting-title" class="setting-view__title">设定集</h2>
        <p class="setting-view__desc">构建故事世界观、角色体系和关系网络，作为后续所有阶段的创作基础</p>
      </div>
      <span v-if="isConfirmed" class="confirmed-badge">
        <CheckCircleOutlined />
        已确认
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="setting-loading" class="setting-view__loading">
      <LoadingOutlined spin class="setting-view__loading-icon" />
      <div>
        <p class="setting-view__loading-text">AI 正在生成设定集</p>
        <p class="setting-view__loading-sub">基于你的故事创意构建完整的世界观与角色体系...</p>
      </div>
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
        <a-button data-testid="setting-retry-btn" size="small" @click="handleGenerate">重试</a-button>
      </template>
    </a-alert>

    <!-- Empty State -->
    <EmptyState
      v-if="!settingData && !loading && initialLoadDone"
      description="设定尚未生成"
    />

    <!-- Setting Content -->
    <template v-if="settingData && !loading">
      <div class="setting-view__content">
        <div class="setting-view__tabs-row">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="setting-view__tab"
            :class="{ 'setting-view__tab--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >{{ tab.label }}</button>
        </div>

        <div class="setting-view__panel">
          <WorldBuilder v-if="activeTab === 'world'" :content="settingData.output" :readonly="isConfirmed" />
          <CharacterCard v-if="activeTab === 'characters'" :content="settingData.output" :readonly="isConfirmed" />
          <RelationGraph v-if="activeTab === 'relationships'" :content="settingData.output" :readonly="isConfirmed" />
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!isConfirmed" class="setting-view__actions">
        <div class="setting-view__actions-left">
          <a-button
            data-testid="regenerate-setting-btn"
            :loading="regenerating"
            @click="handleRegenerate"
          >
            <ReloadOutlined /> {{ regenerating ? '刷新中...' : '刷新关联内容' }}
          </a-button>
          <a-button
            danger
            data-testid="reject-setting-btn"
            @click="handleReject"
          >
            <CloseOutlined /> 驳回，重新生成
          </a-button>
        </div>
        <a-button
          type="primary"
          data-testid="confirm-setting-btn"
          class="setting-view__confirm-btn"
          @click="handleConfirm"
        >
          <CheckCircleOutlined /> 确认设定，进入大纲阶段 <RightOutlined />
        </a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {
  CheckCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  CloseOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
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

const tabs = [
  { key: 'world', label: '世界观' },
  { key: 'characters', label: '角色' },
  { key: 'relationships', label: '关系' },
];
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
  previousPhase: 'IDEA',
  previousGetFn: getIdea,
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
  if (settingDone && ideaDone && !loading.value && (!settingData.value || settingData.value?.status === 'REJECTED')) {
    handleGenerate();
  }
});
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.setting-view {
  padding: 0;
}

.setting-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 32px 24px 0;
}

.setting-view__title {
  font-size: var(--font-size-heading);
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.setting-view__desc {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 0;
}

.confirmed-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 6px 12px;
  border-radius: 6px;
  flex-shrink: 0;
}

/* ── Loading ────────────────────────────────────────── */
.setting-view__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin: 0 24px;
}

.setting-view__loading-icon {
  font-size: var(--font-size-display);
  color: #3b82f6;
}

.setting-view__loading-text {
  font-size: var(--font-size-body);
  color: #374151;
  margin: 0;
}

.setting-view__loading-sub {
  font-size: var(--font-size-body);
  color: #6b7280;
  margin: 4px 0 0;
}

.setting-view__error { margin: 0 24px 16px; }

/* ── Content ───────────────────────────────────────── */
.setting-view__content {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin: 0 24px;
}

.setting-view__tabs-row {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.setting-view__tab {
  flex: 1;
  padding: 12px 0;
  font-size: var(--font-size-body);
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.setting-view__tab:hover { color: #374151; }

.setting-view__tab--active {
  color: #111827;
  background: #f9fafb;
  border-bottom-color: #111827;
}

.setting-view__panel {
  padding: 24px;
}

/* ── Actions ───────────────────────────────────────── */
.setting-view__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  gap: 12px;
  flex-wrap: wrap;
}

.setting-view__actions-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-view__confirm-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827 !important;
  border-color: #111827 !important;
  color: #fff !important;
}
.setting-view__confirm-btn:hover:not(:disabled) {
  background: #374151 !important;
  border-color: #374151 !important;
}
</style>
