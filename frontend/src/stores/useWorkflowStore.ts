import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createStorePersistence } from './persist';

export type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED';

export const PHASE_ORDER: PhaseType[] = ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'];

interface PersistedState {
  currentPhase: PhaseType;
  stepStatuses: Record<PhaseType, StepStatus>;
}

const DEFAULT_STEP_STATUSES: Record<PhaseType, StepStatus> = {
  IDEA: 'PENDING',
  SETTING: 'PENDING',
  OUTLINE: 'PENDING',
  BEATS: 'PENDING',
  DRAFTING: 'PENDING',
  COMPLETED: 'PENDING',
};

const storePersist = createStorePersistence<PersistedState>('workflowStore', {
  currentPhase: 'IDEA',
  stepStatuses: { ...DEFAULT_STEP_STATUSES },
});

export const useWorkflowStore = defineStore('workflowStore', () => {
  const persisted = storePersist.load();

  const currentPhase = ref<PhaseType>(persisted.currentPhase);
  const stepStatuses = ref<Record<PhaseType, StepStatus>>({
    ...DEFAULT_STEP_STATUSES,
    ...persisted.stepStatuses,
  });

  const phaseOrder = computed(() => PHASE_ORDER);

  function getPhaseIndex(phase: PhaseType): number {
    return PHASE_ORDER.indexOf(phase);
  }

  function setCurrentPhase(phase: PhaseType) {
    currentPhase.value = phase;
    storePersist.save({ currentPhase: currentPhase.value, stepStatuses: stepStatuses.value });
  }

  function setStepStatus(phase: PhaseType, status: StepStatus) {
    stepStatuses.value[phase] = status;
    storePersist.save({ currentPhase: currentPhase.value, stepStatuses: stepStatuses.value });
  }

  function getStepStatus(phase: PhaseType): StepStatus {
    return stepStatuses.value[phase];
  }

  function isPhaseAccessible(phase: PhaseType): boolean {
    return getPhaseIndex(phase) <= getPhaseIndex(currentPhase.value);
  }

  return {
    currentPhase,
    stepStatuses,
    phaseOrder,
    getPhaseIndex,
    setCurrentPhase,
    setStepStatus,
    getStepStatus,
    isPhaseAccessible,
  };
});
