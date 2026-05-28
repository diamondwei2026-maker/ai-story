<template>
  <div class="workflow-stepper">
    <div
      v-if="showAlertBanner"
      data-testid="factsheet-alert-banner"
      class="factsheet-alert-banner"
      :class="{
        'factsheet-alert-banner--warning': factsheetAlert?.level === 'WARNING',
        'factsheet-alert-banner--critical': factsheetAlert?.level === 'CRITICAL',
      }"
    >
      <span data-testid="factsheet-alert-text" class="factsheet-alert-banner__text">
        事实簿同步延迟，建议暂停生成新章并手动触发同步
      </span>
      <span data-testid="factsheet-alert-depth" class="factsheet-alert-banner__depth">
        队列深度: {{ factsheetAlert?.depth ?? 0 }}
      </span>
      <a-button
        data-testid="force-sync-btn"
        size="small"
        type="primary"
        @click="emit('force-sync')"
      >
        手动同步
      </a-button>
    </div>

    <div
      v-if="showCompletionBanner"
      data-testid="completion-banner-area"
      class="completion-banner-area"
    >
      <slot name="completion-banner" />
    </div>

    <div v-if="isReadonly" data-testid="readonly-overlay" class="readonly-overlay">
      <div class="readonly-overlay__badge">只读模式 · 已完本</div>
    </div>

    <div class="stepper__counter">步骤 {{ currentIndex + 1 }}/{{ steps.length }}</div>

    <a-steps :current="currentIndex" size="small" @click="onStepsClick">
      <a-step
        v-for="(step, index) in steps"
        :key="step.phase"
        :status="mapStatus(step.status)"
        :data-testid="'step-item'"
        :data-step-index="index"
      >
        <template #title>
          <span data-testid="step-label">{{ step.label }}</span>
        </template>
        <template #description>
          <span data-testid="step-status">{{ statusLabel(step.status) }}</span>
        </template>
      </a-step>
    </a-steps>

    <div v-if="isReadonly" class="stepper__reopen">
      <a-button
        data-testid="reopen-project-btn"
        @click="emit('reopen-project')"
      >
        继续创作
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PhaseType, StepStatus } from '@/stores/useWorkflowStore';

export interface StepInfo {
  phase: PhaseType;
  label: string;
  status: StepStatus;
}

export interface FactsheetAlert {
  level: 'NORMAL' | 'PRIORITY' | 'WARNING' | 'CRITICAL';
  depth: number;
}

const props = defineProps<{
  steps: StepInfo[];
  currentPhase: PhaseType;
  phaseOrder: PhaseType[];
  factsheetAlert?: FactsheetAlert;
  projectStatus?: string;
  allChaptersCompleted?: boolean;
}>();

const emit = defineEmits<{
  'step-click': [phase: PhaseType];
  'force-sync': [];
  'reopen-project': [];
}>();

const currentIndex = computed(() => props.phaseOrder.indexOf(props.currentPhase));

const showAlertBanner = computed(() => {
  if (!props.factsheetAlert) return false;
  return (
    props.factsheetAlert.level === 'WARNING' ||
    props.factsheetAlert.level === 'CRITICAL'
  );
});

const isReadonly = computed(() => props.projectStatus === 'COMPLETED');

const showCompletionBanner = computed(() => {
  return (
    props.allChaptersCompleted === true && props.projectStatus !== 'COMPLETED'
  );
});

function mapStatus(status: StepStatus): 'wait' | 'process' | 'finish' | 'error' {
  const map: Record<StepStatus, 'wait' | 'process' | 'finish' | 'error'> = {
    PENDING: 'wait',
    IN_PROGRESS: 'process',
    CONFIRMED: 'finish',
    REJECTED: 'error',
  };
  return map[status];
}

const statusLabels: Record<StepStatus, string> = {
  PENDING: '待开始',
  IN_PROGRESS: '进行中',
  CONFIRMED: '已完成',
  REJECTED: '需修改',
};

function statusLabel(status: StepStatus): string {
  return statusLabels[status];
}

function isClickable(index: number): boolean {
  if (isReadonly.value) return false;
  return index <= currentIndex.value;
}

function onStepsClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('[data-step-index]') as HTMLElement | null;
  if (!target) return;
  const index = Number(target.dataset.stepIndex);
  if (Number.isNaN(index)) return;
  if (isClickable(index)) {
    emit('step-click', props.phaseOrder[index]);
  }
}
</script>

<style scoped>
.workflow-stepper {
  padding: 16px 0;
}

.stepper__counter {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

/* ─── Factsheet Alert Banner ─── */

.factsheet-alert-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.factsheet-alert-banner--warning {
  background-color: var(--color-warning-light);
  border: 1px solid var(--color-warning);
  color: #92400e;
}

.factsheet-alert-banner--critical {
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error);
  color: #991b1b;
}

.factsheet-alert-banner__text {
  font-weight: 600;
}

.factsheet-alert-banner__depth {
  font-weight: 500;
  opacity: 0.85;
}

/* ─── Completion Banner Area ─── */

.completion-banner-area {
  margin-bottom: 12px;
}

/* ─── Read-only Overlay ─── */

.readonly-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  margin-bottom: 12px;
}

.readonly-overlay__badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 12px;
  background-color: var(--color-success-light);
  border: 1px solid var(--color-success);
  color: #065f46;
  font-size: 12px;
  font-weight: 600;
}

/* ─── Reopen Button ─── */

.stepper__reopen {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
