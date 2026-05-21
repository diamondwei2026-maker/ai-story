<template>
  <div class="workflow-stepper">
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

const props = defineProps<{
  steps: StepInfo[];
  currentPhase: PhaseType;
  phaseOrder: PhaseType[];
}>();

const emit = defineEmits<{
  'step-click': [phase: PhaseType];
}>();

const currentIndex = computed(() => props.phaseOrder.indexOf(props.currentPhase));

function isClickable(index: number): boolean {
  return index <= currentIndex.value;
}

function handleClick(step: StepInfo, index: number) {
  if (isClickable(index)) {
    emit('step-click', step.phase);
  }
}
</script>

<style scoped>
@import url('@/styles/css-variables.css');

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
  background-color: var(--color-border-light);
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.step--active .step-item__indicator {
  background-color: var(--color-gold);
  color: #fff;
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
  color: var(--color-gold);
  font-weight: 700;
}

.step-item__connector {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  width: calc(100% - 40px);
  height: 2px;
  background-color: var(--color-border-light);
}

.step--completed .step-item__connector {
  background-color: var(--color-success);
}

.step-item__check {
  font-size: 16px;
}
</style>
