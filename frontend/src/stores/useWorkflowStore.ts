import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadJSON, saveJSON } from './persist';

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

const DEFAULT_FALLBACK: PersistedState = {
  currentPhase: 'IDEA',
  stepStatuses: { ...DEFAULT_STEP_STATUSES },
};

/** 本地持久化 key 前缀：按项目隔离，避免不同项目间状态串扰 */
const SCOPE_PREFIX = 'workflowStore:';

function scopedKey(projectId: string): string {
  return `${SCOPE_PREFIX}${projectId}`;
}

function loadOrDefault(projectId: string): PersistedState {
  const key = scopedKey(projectId);
  const saved = loadJSON<PersistedState | null>(key, null);
  if (saved) return saved;

  // 一次性迁移：如果旧全局 key 有数据，迁移到新 scoped key（最多一次）
  const legacy = loadJSON<PersistedState | null>('workflowStore', null);
  if (legacy) {
    saveJSON(key, legacy);
    localStorage.removeItem('workflowStore'); // 迁移后清除旧 key
    return legacy;
  }

  return { ...DEFAULT_FALLBACK, stepStatuses: { ...DEFAULT_STEP_STATUSES } };
}

export const useWorkflowStore = defineStore('workflowStore', () => {
  /**
   * 当前激活的项目 ID。
   * 必须在组件中调用 `loadForProject(id)` 完成初始化，
   * 之后所有 set / get 才会写入该项目的隔离作用域。
   */
  const projectId = ref<string | null>(null);

  const currentPhase = ref<PhaseType>(DEFAULT_FALLBACK.currentPhase);
  const stepStatuses = ref<Record<PhaseType, StepStatus>>({ ...DEFAULT_STEP_STATUSES });

  const phaseOrder = computed(() => PHASE_ORDER);

  function getPhaseIndex(phase: PhaseType): number {
    return PHASE_ORDER.indexOf(phase);
  }

  /** 从 localStorage 加载指定项目的状态快照 */
  function loadForProject(id: string) {
    if (projectId.value === id) return; // 已经是当前项目，无需重载
    projectId.value = id;
    const state = loadOrDefault(id);
    currentPhase.value = state.currentPhase;
    stepStatuses.value = { ...DEFAULT_STEP_STATUSES, ...state.stepStatuses };
  }

  /** 写入当前项目的 localStorage 作用域 */
  function persist() {
    if (!projectId.value) return;
    saveJSON(scopedKey(projectId.value), {
      currentPhase: currentPhase.value,
      stepStatuses: stepStatuses.value,
    });
  }

  function setCurrentPhase(phase: PhaseType) {
    currentPhase.value = phase;
    persist();
  }

  function setStepStatus(phase: PhaseType, status: StepStatus) {
    stepStatuses.value[phase] = status;
    persist();
  }

  function getStepStatus(phase: PhaseType): StepStatus {
    return stepStatuses.value[phase];
  }

  function isPhaseAccessible(phase: PhaseType): boolean {
    return getPhaseIndex(phase) <= getPhaseIndex(currentPhase.value);
  }

  return {
    projectId,
    currentPhase,
    stepStatuses,
    phaseOrder,
    getPhaseIndex,
    loadForProject,
    setCurrentPhase,
    setStepStatus,
    getStepStatus,
    isPhaseAccessible,
  };
});
