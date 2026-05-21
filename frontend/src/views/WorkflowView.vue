<template>
  <div class="workflow-view">
    <div class="workflow-view__header">
      <h1 data-testid="project-title" class="workflow-view__title">
        小说项目
      </h1>
      <span data-testid="project-id-display" class="workflow-view__id">
        {{ projectId }}
      </span>
    </div>
    <WorkflowStepper
      :steps="steps"
      :currentPhase="store.currentPhase"
      :phaseOrder="store.phaseOrder"
      @step-click="handleStepClick"
    />
    <div class="workflow-view__content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkflowStore, PHASE_ORDER } from '@/stores/useWorkflowStore';
import type { StepInfo } from '@/components/WorkflowStepper.vue';
import WorkflowStepper from '@/components/WorkflowStepper.vue';

const route = useRoute();
const store = useWorkflowStore();

const projectId = computed(() => route.params.id as string);

const phaseLabels: Record<string, string> = {
  IDEA: '灵感提取',
  SETTING: '设定集',
  OUTLINE: '剧情大纲',
  BEATS: '细纲拆解',
  DRAFTING: '正文迭代',
};

const steps = computed<StepInfo[]>(() =>
  PHASE_ORDER.map((phase) => ({
    phase,
    label: phaseLabels[phase] || phase,
    status: store.getStepStatus(phase),
  }))
);

function handleStepClick(phase: string) {
  store.setCurrentPhase(phase as any);
}
</script>

<style scoped>
@import url('@/styles/css-variables.css');

.workflow-view {
  max-width: 900px;
  margin: 0 auto;
}

.workflow-view__header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.workflow-view__title {
  font-size: 24px;
  color: var(--color-text-primary);
}

.workflow-view__id {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.workflow-view__content {
  margin-top: 24px;
  padding: 24px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid var(--color-border-light);
}
</style>
