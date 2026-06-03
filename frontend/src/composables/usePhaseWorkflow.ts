import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowStore, type PhaseType, type StepStatus } from '@/stores/useWorkflowStore';

interface StepLike {
  status: string;
  output: string;
  review: Record<string, unknown>;
}

interface PreviousPhaseDef<T extends StepLike> {
  phase: PhaseType;
  getFn: (projectId: string) => Promise<T | null>;
}

interface UsePhaseWorkflowOptions<T extends StepLike> {
  projectId: string;
  phase: PhaseType;
  nextPhase: PhaseType;
  getFn: (projectId: string) => Promise<T | null>;
  generateFn: (projectId: string, opts: Record<string, string>) => Promise<T>;
  confirmFn: (projectId: string) => Promise<T>;
  rejectFn: (projectId: string) => Promise<T>;
  generateArgs: () => Record<string, string>;
  /**
   * 所有前置阶段的定义列表，用于 mount 时同步其状态到 store。
   * 按 phaseOrder 排列（最早在前），确保整个链条的状态不会因 localStorage 丢失而显示错误。
   * 例如：OUTLINE 阶段应传入 [{phase:'IDEA', getFn:getIdea}, {phase:'SETTING', getFn:getSetting}]
   */
  previousPhases?: PreviousPhaseDef<T>[];
  /** @deprecated 使用 previousPhases 数组替代，保留以兼容旧代码 */
  previousPhase?: PhaseType;
  /** @deprecated 使用 previousPhases 数组替代，保留以兼容旧代码 */
  previousGetFn?: (projectId: string) => Promise<T | null>;
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

export function usePhaseWorkflow<T extends StepLike>(opts: UsePhaseWorkflowOptions<T>) {
  const store = useWorkflowStore();
  const router = useRouter();

  const data = ref<T | null>(null);
  const loading = ref(false);
  const regenerating = ref(false);
  const error = ref<string | null>(null);
  const initialLoadDone = ref(false);

  const isConfirmed = computed(() => {
    return (
      data.value?.status === 'CONFIRMED' ||
      store.getStepStatus(opts.phase) === 'CONFIRMED'
    );
  });

  onMounted(async () => {
    try {
      const existing = await opts.getFn(opts.projectId);
      if (existing) {
        data.value = existing;
        // 将后端数据状态同步到 workflow store，确保 Stepper 正确显示
        const mapped = backendStatusToStepStatus(existing.status);
        if (mapped) {
          store.setStepStatus(opts.phase, mapped);
        }
      }

      // 同步所有前置阶段的状态到 store。
      // 原因：如果 localStorage 丢失，Stepper 会回退到默认 PENDING，
      // 但实际上这些前置阶段在服务端可能已是 CONFIRMED（用户之前已确认过）。
      //
      // 例如进入 OUTLINE 阶段时，需要确保 IDEA 和 SETTING 都显示为已完成，
      // 而非仅同步 SETTING（只回溯一层会导致 IDEA 显示「待开始」的 bug）。
      const prevPhasesToSync: PreviousPhaseDef<T>[] = [];

      // 新 API：previousPhases 数组
      if (opts.previousPhases && opts.previousPhases.length > 0) {
        prevPhasesToSync.push(...opts.previousPhases);
      }
      // 兼容旧 API：previousPhase + previousGetFn 对
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
            const prevMapped = backendStatusToStepStatus(prev.status);
            if (prevMapped) {
              store.setStepStatus(phase, prevMapped);
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
      // 生成成功后同步后端状态到 store（后端可能返回 AI_GENERATING / AWAITING_REVIEW）
      const mapped = backendStatusToStepStatus(result.status);
      if (mapped) {
        store.setStepStatus(opts.phase, mapped);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败';
      // 生成失败时回退状态，避免卡在「进行中」
      store.setStepStatus(opts.phase, previousStatus);
    } finally {
      loading.value = false;
    }
  }

  async function handleRegenerate() {
    regenerating.value = true;
    error.value = null;
    try {
      const currentOutput = data.value?.output ?? '';
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
      const result = await opts.confirmFn(opts.projectId);
      data.value = result;
      store.setStepStatus(opts.phase, 'CONFIRMED');
      store.setCurrentPhase(opts.nextPhase);
      const nextRoute = `workflow.${opts.nextPhase.toLowerCase()}`;
      router.push({ name: nextRoute, params: { id: opts.projectId } }).catch(() => {
        // Route may not exist yet (e.g., BEATS, DRAFTING) — silently ignore
      });
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
      // "驳回，重新生成" = just regenerate fresh content.
      // No need to persist a REJECTED status that gets overwritten immediately.
      const fresh = await opts.generateFn(opts.projectId, opts.generateArgs());
      data.value = fresh;
      // 生成成功后同步后端状态到 store
      const mapped = backendStatusToStepStatus(fresh.status);
      if (mapped) {
        store.setStepStatus(opts.phase, mapped);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '重新生成失败';
      // 生成失败时回退状态
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
