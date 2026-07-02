import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowStore, type PhaseType, type StepStatus } from '@/stores/useWorkflowStore';

interface StepLike {
  status: string;
  output: string;
  review: Record<string, unknown>;
}

interface PreviousPhaseDef {
  phase: PhaseType;
  getFn: (projectId: string) => Promise<unknown>;
}

interface UsePhaseWorkflowOptions<T> {
  projectId: string;
  phase: PhaseType;
  nextPhase: PhaseType;
  getFn: (projectId: string) => Promise<T | null>;
  generateFn: (projectId: string, opts: Record<string, unknown>) => Promise<T>;
  confirmFn: (projectId: string) => Promise<unknown>;
  rejectFn?: (projectId: string) => Promise<unknown>;
  generateArgs: () => Record<string, unknown>;
  /**
   * 所有前置阶段的定义列表，用于 mount 时同步其状态到 store。
   * 按 phaseOrder 排列（最早在前），确保整个链条的状态不会因 localStorage 丢失而显示错误。
   * 例如：OUTLINE 阶段应传入 [{phase:'IDEA', getFn:getIdea}, {phase:'SETTING', getFn:getSetting}]
   */
  previousPhases?: PreviousPhaseDef[];
  /** @deprecated 使用 previousPhases 数组替代，保留以兼容旧代码 */
  previousPhase?: PhaseType;
  /** @deprecated 使用 previousPhases 数组替代，保留以兼容旧代码 */
  previousGetFn?: (projectId: string) => Promise<unknown>;
  /**
   * 从数据中提取后端状态字符串，用于 store 同步。
   * 若不提供，默认读取 (data as any).status（兼容 StepData 类型）。
   * 对于数组类型数据（如 BeatData[]），可从 store 获取状态。
   */
  getStatus?: (data: T) => string | null;
  /**
   * 从数据中提取当前输出文本，用于重新生成时作为 currentContent 传入。
   * 若不提供，默认读取 (data as any).output（兼容 StepData 类型）。
   */
  getCurrentOutput?: (data: T) => string;
}

/**
 * 将后端 StepData 的状态映射为前端 StepStatus。
 * 后端状态: PENDING | AI_GENERATING | AWAITING_REVIEW | CONFIRMED | REJECTED
 * 前端状态: PENDING | IN_PROGRESS | CONFIRMED | REJECTED
 */
function backendStatusToStepStatus(status: string): StepStatus | null {
  switch (status) {
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'REJECTED':
      return 'REJECTED';
    case 'AI_GENERATING':
    case 'AWAITING_REVIEW':
      return 'IN_PROGRESS';
    case 'PENDING':
      return 'PENDING';
    default:
      return null;
  }
}

/** 从数据中提取状态字符串 */
function extractStatus<T>(data: T, opts: UsePhaseWorkflowOptions<T>): string | null {
  if (opts.getStatus) return opts.getStatus(data);
  return (data as unknown as StepLike)?.status ?? null;
}

/** 从数据中提取当前输出文本 */
function extractOutput<T>(data: T, opts: UsePhaseWorkflowOptions<T>): string {
  if (opts.getCurrentOutput) return opts.getCurrentOutput(data);
  return (data as unknown as StepLike)?.output ?? '';
}

export function usePhaseWorkflow<T>(opts: UsePhaseWorkflowOptions<T>) {
  const store = useWorkflowStore();
  const router = useRouter();

  const data = ref<T | null>(null);
  const loading = ref(false);
  const regenerating = ref(false);
  const error = ref<string | null>(null);
  const initialLoadDone = ref(false);

  const isConfirmed = computed(() => {
    return (
      extractStatus(data.value as T, opts) === 'CONFIRMED' ||
      store.getStepStatus(opts.phase) === 'CONFIRMED'
    );
  });

  onMounted(async () => {
    try {
      const existing = await opts.getFn(opts.projectId);
      if (existing) {
        data.value = existing;
        // 将后端数据状态同步到 workflow store，确保 Stepper 正确显示
        const status = extractStatus(existing, opts);
        if (status) {
          const mapped = backendStatusToStepStatus(status);
          if (mapped) {
            store.setStepStatus(opts.phase, mapped);
          }
        }
      }

      // 同步所有前置阶段的状态到 store。
      const prevPhasesToSync: PreviousPhaseDef[] = [];

      if (opts.previousPhases && opts.previousPhases.length > 0) {
        prevPhasesToSync.push(...opts.previousPhases);
      }
      if (opts.previousGetFn && opts.previousPhase) {
        const alreadyIncluded = prevPhasesToSync.some(
          (p) => p.phase === opts.previousPhase,
        );
        if (!alreadyIncluded) {
          prevPhasesToSync.push({
            phase: opts.previousPhase,
            getFn: opts.previousGetFn,
          });
        }
      }

      for (const { phase, getFn } of prevPhasesToSync) {
        try {
          const prev = await getFn(opts.projectId);
          if (prev) {
            const prevStatus = (prev as StepLike)?.status;
            if (prevStatus) {
              const prevMapped = backendStatusToStepStatus(prevStatus);
              if (prevMapped) {
                store.setStepStatus(phase, prevMapped);
              }
            }
          }
        } catch {
          // Silently ignore — best effort sync
        }
      }
    } catch {
      // Silently ignore fetch errors on mount
    } finally {
      initialLoadDone.value = true;
    }
  });

  async function handleGenerate() {
    loading.value = true;
    error.value = null;
    const previousStatus = store.getStepStatus(opts.phase);
    store.setStepStatus(opts.phase, 'IN_PROGRESS');
    try {
      const result = await opts.generateFn(opts.projectId, opts.generateArgs());
      data.value = result;
      // 生成成功后同步后端状态到 store
      const status = extractStatus(result, opts);
      if (status) {
        const mapped = backendStatusToStepStatus(status);
        if (mapped) {
          store.setStepStatus(opts.phase, mapped);
        }
      } else {
        // 若无显式状态（如数组类型），标记为已生成
        store.setStepStatus(opts.phase, 'IN_PROGRESS');
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败';
      store.setStepStatus(opts.phase, previousStatus);
    } finally {
      loading.value = false;
    }
  }

  async function handleRegenerate() {
    regenerating.value = true;
    error.value = null;
    try {
      const currentOutput = data.value ? extractOutput(data.value, opts) : '';
      const result = await opts.generateFn(opts.projectId, {
        ...opts.generateArgs(),
        currentContent: currentOutput,
      });
      data.value = result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '刷新失败';
    } finally {
      regenerating.value = false;
    }
  }

  async function handleConfirm() {
    try {
      await opts.confirmFn(opts.projectId);
      store.setStepStatus(opts.phase, 'CONFIRMED');
      store.setCurrentPhase(opts.nextPhase);
      const nextRoute = `workflow.${opts.nextPhase.toLowerCase()}`;
      router.push({ name: nextRoute, params: { id: opts.projectId } });
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认失败';
    }
  }

  async function handleReject() {
    loading.value = true;
    error.value = null;
    const previousStatus = store.getStepStatus(opts.phase);
    store.setStepStatus(opts.phase, 'IN_PROGRESS');
    try {
      const fresh = await opts.generateFn(opts.projectId, opts.generateArgs());
      data.value = fresh;
      const status = extractStatus(fresh, opts);
      if (status) {
        const mapped = backendStatusToStepStatus(status);
        if (mapped) {
          store.setStepStatus(opts.phase, mapped);
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '重新生成失败';
      store.setStepStatus(opts.phase, previousStatus);
    } finally {
      loading.value = false;
    }
  }

  return {
    data,
    loading,
    regenerating,
    error,
    isConfirmed,
    initialLoadDone,
    handleGenerate,
    handleRegenerate,
    handleConfirm,
    handleReject,
  };
}
