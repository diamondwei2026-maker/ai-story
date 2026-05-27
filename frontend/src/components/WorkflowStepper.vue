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
      <button
        data-testid="force-sync-btn"
        class="factsheet-alert-banner__sync-btn"
        @click="emit('force-sync')"
      >
        手动同步
      </button>
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
    <div class="stepper__items">
      <div
        v-for="(step, index) in steps"
        :key="step.phase"
        :data-testid="'step-item'"
        class="step-item"
        :class="{
          'step--active': step.phase === currentPhase,
          'step--completed': step.status === 'CONFIRMED',
          'step--in-progress': step.status === 'IN_PROGRESS',
          'step--clickable': isClickable(index),
        }"
        @click="handleClick(step, index)"
      >
        <div class="step-item__indicator">
          <span v-if="step.status === 'CONFIRMED'" class="step-item__check">&#10003;</span>
          <span v-else class="step-item__number">{{ index + 1 }}</span>
        </div>
        <div class="step-item__content">
          <span data-testid="step-label" class="step-item__label">{{ step.label }}</span>
          <span data-testid="step-status" class="step-item__status">
            <template v-if="step.status === 'CONFIRMED'">已完成</template>
            <template v-else-if="step.status === 'IN_PROGRESS'">进行中</template>
            <template v-else-if="step.status === 'REJECTED'">需修改</template>
            <template v-else>待开始</template>
          </span>
        </div>
        <div v-if="index < steps.length - 1" class="step-item__connector" />
      </div>
    </div>

    <div v-if="isReadonly" class="stepper__reopen">
      <button
        data-testid="reopen-project-btn"
        class="reopen-project-btn"
        @click="emit('reopen-project')"
      >
        继续创作
      </button>
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

function isClickable(index: number): boolean {
  if (isReadonly.value) return false;
  return index <= currentIndex.value;
}

function handleClick(step: StepInfo, index: number) {
  if (isClickable(index)) {
    emit('step-click', step.phase);
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

.stepper__items {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  max-width: 140px;
}

.step-item__indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-border);
  color: var(--color-text-muted);
  font-size: 14px;
  margin-bottom: 8px;
  transition: all var(--transition-normal);
}

.step--active .step-item__indicator {
  background-color: var(--color-primary);
  color: #fff;
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.step--completed .step-item__indicator {
  background-color: var(--color-success);
  color: #fff;
}

.step--clickable {
  cursor: pointer;
}

.step-item__content {
  text-align: center;
}

.step-item__label {
  display: block;
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.step-item__status {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.step--active .step-item__label {
  color: var(--color-primary);
  font-weight: 700;
}

.step-item__connector {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  width: calc(100% - 40px);
  height: 2px;
  background-color: var(--color-border);
}

.step--completed .step-item__connector {
  background-color: var(--color-success);
}

.step-item__check {
  font-size: 16px;
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

.factsheet-alert-banner__sync-btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.factsheet-alert-banner__sync-btn:hover {
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

.reopen-project-btn {
  padding: 8px 28px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reopen-project-btn:hover {
  background-color: var(--color-primary);
  color: #fff;
}
</style>
