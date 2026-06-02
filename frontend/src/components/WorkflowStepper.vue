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
        事实簿同步延迟，建议暂停生成新章
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

    <div class="stepper__counter">
      <a-tag>步骤 {{ currentIndex + 1 }} / {{ steps.length }}</a-tag>
    </div>

    <a-steps :current="currentIndex" size="default" @click="onStepsClick">
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
        <template #icon>
          <component :is="phaseIcon(step.phase)" />
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
import { computed, type Component } from 'vue';
import {
  BulbOutlined,
  GlobalOutlined,
  OrderedListOutlined,
  PartitionOutlined,
  EditOutlined,
} from '@ant-design/icons-vue';
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

const PHASE_ICONS: Record<string, Component> = {
  IDEA: BulbOutlined,
  SETTING: GlobalOutlined,
  OUTLINE: OrderedListOutlined,
  BEATS: PartitionOutlined,
  DRAFTING: EditOutlined,
};

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

function phaseIcon(phase: string): Component {
  return PHASE_ICONS[phase] ?? BulbOutlined;
}

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
  // 当前及之前的步骤始终可点击
  if (index <= currentIndex.value) return true;
  // 若前方步骤的所有前置均已确认，也允许点击（处理 localStorage 丢失后从 Hub 进入的正确重定向场景）
  const allPreviousConfirmed = props.steps
    .slice(0, index)
    .every((s) => s.status === 'CONFIRMED');
  return allPreviousConfirmed;
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
  padding: var(--space-md) 0;
}

.stepper__counter {
  text-align: center;
  margin-bottom: var(--space-md);
}

.factsheet-alert-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
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

.completion-banner-area {
  margin-bottom: 12px;
}

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

.stepper__reopen {
  display: flex;
  justify-content: center;
  margin-top: var(--space-md);
}
</style>
