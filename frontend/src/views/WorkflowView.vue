<template>
  <div class="workflow-view">
    <!-- Header -->
    <header class="workflow-view__header">
      <div class="workflow-view__header-inner">
        <div class="workflow-view__header-left">
          <button class="workflow-view__back-btn" @click="router.push('/')">
            <ArrowLeftOutlined />
            返回项目
          </button>
          <span class="workflow-view__divider" />
          <span class="workflow-view__project-name">{{ projectTitle }}</span>
        </div>

        <div class="workflow-view__header-center">
          <WorkflowStepper
            :steps="steps"
            :currentPhase="store.currentPhase"
            :phaseOrder="store.phaseOrder"
            @step-click="handleStepClick"
          />
        </div>

        <div class="workflow-view__header-right">
          <ModelBadge
            v-if="aiStatus.aiMeta.value"
            :model-name="aiStatus.aiMeta.value.modelUsed"
            :degraded="aiStatus.aiMeta.value.degraded"
          />
        </div>
      </div>
    </header>

    <!-- Breadcrumb Alert for read-only browsing -->
    <div
      v-if="isViewingCompletedStage"
      class="workflow-view__readonly-banner"
    >
      <span>正在浏览已完成阶段（只读）</span>
      <button @click="handleReturnToCurrent">
        返回当前阶段
      </button>
    </div>

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
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import { useWorkflowStore, PHASE_ORDER, type PhaseType } from '@/stores/useWorkflowStore';
import { useProjectStore } from '@/stores/useProjectStore';
import type { StepInfo } from '@/components/WorkflowStepper.vue';
import WorkflowStepper from '@/components/WorkflowStepper.vue';
import ModelBadge from '@/components/ModelBadge.vue';
import AiUnavailableModal from '@/components/AiUnavailableModal.vue';
import { useAiStatus } from '@/composables/useAiStatus';

const PHASE_TO_ROUTE: Record<string, string> = {
  IDEA: 'workflow.idea',
  SETTING: 'workflow.setting',
  OUTLINE: 'workflow.outline',
  BEATS: 'workflow.beats',
  DRAFTING: 'workflow.drafting',
};

const PHASE_ORDER_KEYS = PHASE_ORDER as readonly PhaseType[];
const phaseLabels: Record<string, string> = {
  IDEA: '灵感提取',
  SETTING: '设定集',
  OUTLINE: '剧情大纲',
  BEATS: '细纲拆解',
  DRAFTING: '正文迭代',
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

const steps = computed<StepInfo[]>(() =>
  PHASE_ORDER_KEYS.map((phase) => ({
    phase,
    label: phaseLabels[phase] || phase,
    status: store.getStepStatus(phase),
  })),
);

const isViewingCompletedStage = ref(false);

function currentRoutePhase(): PhaseType | null {
  const name = route.name as string;
  for (const [phase, routeName] of Object.entries(PHASE_TO_ROUTE)) {
    if (name === routeName || name.startsWith(routeName)) return phase as PhaseType;
  }
  return null;
}

const isBrowsingCompleted = computed(() => {
  const viewingPhase = currentRoutePhase();
  if (!viewingPhase) return false;
  const viewingIdx = PHASE_ORDER_KEYS.indexOf(viewingPhase);
  const currentIdx = PHASE_ORDER_KEYS.indexOf(store.currentPhase);
  return viewingIdx < currentIdx;
});

watch(isBrowsingCompleted, (val) => {
  isViewingCompletedStage.value = val;
});

function handleReturnToCurrent() {
  store.setCurrentPhase(store.currentPhase);
  const routeName = PHASE_TO_ROUTE[store.currentPhase];
  if (routeName) {
    router.push({ name: routeName, params: { id: projectId.value } });
  }
  isViewingCompletedStage.value = false;
}

function handleStepClick(phase: string) {
  const routeName = PHASE_TO_ROUTE[phase];
  if (routeName) {
    router.push({ name: routeName, params: { id: projectId.value } });
  }
  store.setCurrentPhase(phase as PhaseType);
}

watch(
  projectId,
  (id) => {
    store.loadForProject(id);
  },
  { immediate: true },
);

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
/* ── Layout ─────────────────────────────────────────────── */
.workflow-view {
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────────────────── */
.workflow-view__header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 20;
}

.workflow-view__header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.workflow-view__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.workflow-view__back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.workflow-view__back-btn:hover {
  color: #111827;
  background: #f3f4f6;
}

.workflow-view__divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
}

.workflow-view__project-name {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.workflow-view__header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.workflow-view__header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* ── Readonly Banner ────────────────────────────────────── */
.workflow-view__readonly-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: var(--font-size-body);
  color: #92400e;
  margin: 16px auto 0;
  max-width: 64rem;
  width: calc(100% - 48px);
}

.workflow-view__readonly-banner button {
  color: #92400e;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-body);
}

/* ── Content ────────────────────────────────────────────── */
.workflow-view__content {
  flex: 1;
  padding: 0;
}
</style>
