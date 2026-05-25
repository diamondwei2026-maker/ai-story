import { ref, computed, onMounted } from 'vue';
import { useWorkflowStore, type PhaseType } from '@/stores/useWorkflowStore';

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

export function usePhaseWorkflow<T extends StepLike>(opts: UsePhaseWorkflowOptions<T>) {
  const store = useWorkflowStore();

  const data = ref<T | null>(null);
  const loading = ref(false);
  const regenerating = ref(false);
  const error = ref<string | null>(null);

  const isConfirmed = computed(() => {
    return (
      data.value?.status === 'CONFIRMED' ||
      store.getStepStatus(opts.phase) === 'CONFIRMED'
    );
  });

  const reviewAnnotations = computed(() => {
    const annotations = data.value?.review?.annotations;
    return typeof annotations === 'string' ? annotations : null;
  });

  onMounted(async () => {
    try {
      const existing = await opts.getFn(opts.projectId);
      if (existing) {
        data.value = existing;
      }
    } catch {
      // Silently ignore fetch errors on mount
    }
  });

  async function handleGenerate() {
    loading.value = true;
    error.value = null;
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
    } catch (e) {
      error.value = e instanceof Error ? e.message : '确认失败';
    }
  }

  async function handleReject() {
    loading.value = true;
    error.value = null;
    try {
      const result = await opts.rejectFn(opts.projectId);
      data.value = result;
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
    reviewAnnotations,
    handleGenerate,
    handleRegenerate,
    handleConfirm,
    handleReject,
  };
}
