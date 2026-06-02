import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowStore, type PhaseType, type StepStatus } from '@/stores/useWorkflowStore';

interface StepLike {
  status: string;
  output: string;
  review: Record<string, unknown>;
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
    } catch {
      // Silently ignore fetch errors on mount
    } finally {
      initialLoadDone.value = true;
    }
  });

  async function handleGenerate() {
    loading.value = true;
    error.value = null;
    store.setStepStatus(opts.phase, 'IN_PROGRESS');
    try {
      const result = await opts.generateFn(opts.projectId, opts.generateArgs());
      data.value = result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败';
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
    try {
      const result = await opts.rejectFn(opts.projectId);
      // Mark as rejected but don't update data.value yet —
      // handleGenerate will overwrite it with the fresh generation
      store.setStepStatus(opts.phase, 'REJECTED');
      // Immediately regenerate new content after rejection,
      // matching the button label "驳回，重新生成"
      await handleGenerate();
    } catch (e) {
      error.value = e instanceof Error ? e.message : '驳回失败';
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
