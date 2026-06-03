<template>
  <div class="workflow-view page-container">
    <div class="workflow-view__header">
      <a-page-header
        :title="projectTitle"
        class="workflow-view__page-header"
        @back="router.push('/')"
      >
        <template #tags>
          <a-tag :color="phaseTagColor">{{ currentPhaseLabel }}</a-tag>
        </template>
        <template #extra>
          <ModelBadge
            v-if="aiStatus.aiMeta.value"
            :model-name="aiStatus.aiMeta.value.modelUsed"
            :degraded="aiStatus.aiMeta.value.degraded"
          />
        </template>
      </a-page-header>
    </div>

    <WorkflowStepper
      :steps="steps"
      :currentPhase="store.currentPhase"
      :phaseOrder="store.phaseOrder"
      @step-click="handleStepClick"
    />

    <div class="workflow-view__content">
      <router-view v-slot="{ Component }">
        <Transition name="phase-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>

    <AiUnavailableModal
      :visible="aiStatus.isUnavailable.value"
      @retry="handleAiRetry"
      @close="aiStatus.setUnavailable(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowStore, PHASE_ORDER, type PhaseType } from '@/stores/useWorkflowStore';
import { useProjectStore } from '@/stores/useProjectStore';
import type { StepInfo } from '@/components/WorkflowStepper.vue';
import WorkflowStepper from '@/components/WorkflowStepper.vue';
import ModelBadge from '@/components/ModelBadge.vue';
import AiUnavailableModal from '@/components/AiUnavailableModal.vue';
import { useAiStatus } from '@/composables/useAiStatus';

/** 已实现前端视图的 phase → route name 映射 */
const PHASE_TO_ROUTE: Record<string, string> = {
  IDEA: 'workflow.idea',
  SETTING: 'workflow.setting',
  OUTLINE: 'workflow.outline',
  BEATS: 'workflow.beats',
  DRAFTING: 'workflow.drafting',
};

const route = useRoute();
const router = useRouter();
const store = useWorkflowStore();
const projectStore = useProjectStore();
const aiStatus = useAiStatus();

const projectId = computed(() => route.params.id as string);

const projectTitle = computed(() => {
  const p = projectStore.projects.find((pr) => pr.id === projectId.value);
  return p?.title ?? '项目';
});

const phaseLabels: Record<string, string> = {
  IDEA: '灵感提取',
  SETTING: '设定集',
  OUTLINE: '剧情大纲',
  BEATS: '细纲拆解',
  DRAFTING: '正文迭代',
};

const currentPhaseLabel = computed(() => phaseLabels[store.currentPhase] ?? store.currentPhase);

const phaseTagColor = computed(() => {
  const map: Record<string, string> = {
    IDEA: 'processing',
    SETTING: 'teal',
    OUTLINE: 'blue',
    BEATS: 'purple',
    DRAFTING: 'orange',
  };
  return map[store.currentPhase] ?? 'default';
});

const steps = computed<StepInfo[]>(() =>
  PHASE_ORDER.map((phase) => ({
    phase,
    label: phaseLabels[phase] || phase,
    status: store.getStepStatus(phase),
  }))
);

function handleStepClick(phase: string) {
  // 1. 先导航到对应 phase 的子路由（仅已实现的 phase）
  const routeName = PHASE_TO_ROUTE[phase];
  if (routeName) {
    router.push({ name: routeName, params: { id: projectId.value } });
  }
  // 2. 再更新 store，确保 Stepper 高亮正确
  store.setCurrentPhase(phase as PhaseType);
}

/** 项目切换时加载该项目隔离的工作流状态快照，
 *  避免不同项目间的 stepStatus 串扰（Issue 根因）。 */
watch(
  projectId,
  (id) => {
    store.loadForProject(id);
  },
  { immediate: true },
);

/** 根据项目服务器状态同步 workflow store 的 currentPhase，
 *  确保刷新页面或从 Hub 进入时 Stepper 与路由一致。 */
watch(
  [() => projectStore.projects, projectId],
  ([projects, id]) => {
    if (!id) return;
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    const serverPhase = project.status;
    const syncedPhase: PhaseType =
      serverPhase === 'IDEA' || serverPhase === 'SETTING' || serverPhase === 'OUTLINE' ||
      serverPhase === 'BEATS' || serverPhase === 'DRAFTING'
        ? serverPhase
        : 'OUTLINE';

    // 仅当 store 与服务器不一致时更新
    if (store.currentPhase !== syncedPhase) {
      store.setCurrentPhase(syncedPhase);
    }
  },
  { immediate: true },
);

function handleAiRetry() {
  aiStatus.setUnavailable(false);
  window.location.reload();
}
</script>

<style scoped>
.workflow-view__header {
  margin-bottom: var(--space-md);
}

.workflow-view__page-header {
  padding: 0;
}

.workflow-view__content {
  margin-top: var(--space-lg);
  padding: var(--space-xl);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}
</style>
