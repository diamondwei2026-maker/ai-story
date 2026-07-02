<template>
  <div class="workflow-stepper">
    <!-- Factsheet Alert Banner -->
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

    <!-- Completion Banner -->
    <div
      v-if="showCompletionBanner"
      data-testid="completion-banner-area"
      class="completion-banner-area"
    >
      <slot name="completion-banner" />
    </div>

    <!-- Readonly Overlay -->
    <div v-if="isReadonly" data-testid="readonly-overlay" class="readonly-overlay">
      <div class="readonly-overlay__badge">只读模式 · 已完本</div>
    </div>

    <!-- Stage Pipeline -->
    <div class="pipeline" data-testid="stage-pipeline">
      <template v-for="(step, index) in steps" :key="step.phase">
        <button
          data-testid="step-item"
          :data-step-index="index"
          class="pipeline__step"
          :class="pipelineStepClass(step, index)"
          :disabled="!isClickable(index)"
          @click="isClickable(index) && emit('step-click', steps[index].phase)"
        >
          <!-- Icon -->
          <span v-if="step.status === 'CONFIRMED'" class="pipeline__icon pipeline__icon--done">
            <CheckOutlined />
          </span>
          <span v-else-if="!isClickable(index)" class="pipeline__icon pipeline__icon--locked">
            <LockOutlined />
          </span>
          <span v-else class="pipeline__icon pipeline__icon--current">
            {{ index + 1 }}
          </span>
          <!-- Label -->
          <span data-testid="step-label" class="pipeline__label">{{ step.label }}</span>
        </button>
        <!-- Connector -->
        <span
          v-if="index < steps.length - 1"
          class="pipeline__connector"
        />
      </template>
    </div>

    <!-- Reopen -->
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
import { CheckOutlined, LockOutlined } from '@ant-design/icons-vue';
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
  if (index <= currentIndex.value) return true;
  const allPreviousConfirmed = props.steps
    .slice(0, index)
    .every((s) => s.status === 'CONFIRMED');
  return allPreviousConfirmed;
}

function pipelineStepClass(step: StepInfo, index: number): Record<string, boolean> {
  const isCurrent = props.steps[currentIndex.value]?.phase === step.phase;
  return {
    'pipeline__step--locked': !isClickable(index),
    'pipeline__step--current': isCurrent,
    'pipeline__step--completed': step.status === 'CONFIRMED' && !isCurrent,
  };
}
</script>

<style scoped>
.workflow-stepper {
  padding: 8px 0;
}

/* ── Alert Banner ───────────────────────────────────────────── */
.factsheet-alert-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 20px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  flex-wrap: wrap;
}

.factsheet-alert-banner--warning {
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.factsheet-alert-banner--critical {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
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

/* ── Readonly ──────────────────────────────────────────────── */
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
  background-color: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
  font-size: var(--font-size-caption);
  font-weight: 600;
}

/* ── Pipeline ──────────────────────────────────────────────── */
.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.pipeline__step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: var(--font-size-caption);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.pipeline__step:hover:not(:disabled) {
  background: #f3f4f6;
}

.pipeline__step--locked {
  color: #d1d5db;
  cursor: not-allowed;
}

.pipeline__step--current {
  background: #111827;
  color: #fff;
}

.pipeline__step--current:hover:not(:disabled) {
  background: #1f2937;
}

.pipeline__step--completed {
  color: #6b7280;
}

.pipeline__step--completed:hover:not(:disabled) {
  background: #f3f4f6;
}

.pipeline__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: var(--font-size-micro);
  font-weight: 600;
}

.pipeline__icon--done {
  color: #6b7280;
}

.pipeline__icon--locked {
  color: #d1d5db;
}

.pipeline__icon--current {
  background: #fff;
  color: #111827;
}

.pipeline__label {
  white-space: nowrap;
}

.pipeline__connector {
  width: 12px;
  height: 1px;
  background: #d1d5db;
  flex-shrink: 0;
}

/* ── Reopen ────────────────────────────────────────────────── */
.stepper__reopen {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>
