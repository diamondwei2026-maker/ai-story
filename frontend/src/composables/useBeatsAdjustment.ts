import { ref } from 'vue';
import { useBeatStore, type Beat, type HookCausalLink } from '@/stores/useBeatStore';
import { adjustBeat, batchAdjustBeats, updateBeatWordCount, updateBeatStructure } from '@/api/beats';
import type { ImpactResponse } from '@/api/beats';

export interface AdjustmentState {
  loading: boolean;
  error: string | null;
  /** Chapters affected by the last adjustment (non-persisted, ephemeral) */
  affectedChapterNumbers: number[];
  warnings: string[];
}

/**
 * @deprecated The server returns impact data in adjustBeat/batchAdjustBeats API responses.
 * Use the response.impact field instead of re-computing on the client.
 * This duplicate is kept only for existing tests; prefer server-authoritative impact data.
 *
 * Pure structural impact detection — zero AI calls.
 * Compares old vs new hookCausalChain to find affected chapters.
 */
export function detectImpact(
  oldChain: HookCausalLink[],
  newChain: HookCausalLink[],
  ownChapterNumber: number,
): { affectedChapterNumbers: number[]; warnings: string[] } {
  const affectedChapterNumbers: number[] = [];
  const warnings: string[] = [];

  const oldRefs = new Map<string, number | null>();
  for (const link of oldChain) {
    oldRefs.set(link.hook, link.resolvesInChapter);
  }

  const newRefs = new Map<string, number | null>();
  const newHookNames = new Set<string>();
  for (const link of newChain) {
    newRefs.set(link.hook, link.resolvesInChapter);
    newHookNames.add(link.hook);
  }

  for (const [hookName, resolveChapter] of oldRefs) {
    if (!newHookNames.has(hookName)) {
      if (resolveChapter != null) {
        affectedChapterNumbers.push(resolveChapter);
        warnings.push(`第${resolveChapter}章引用了已删除的钩子"${hookName}"`);
      }
    } else {
      const newTarget = newRefs.get(hookName);
      if (newTarget !== resolveChapter) {
        if (resolveChapter != null) affectedChapterNumbers.push(resolveChapter);
        if (newTarget != null) affectedChapterNumbers.push(newTarget);
        warnings.push(
          `钩子"${hookName}"的回收章节从第${resolveChapter ?? '未知'}章变更为第${newTarget ?? '未知'}章`,
        );
      }
    }
  }

  return {
    affectedChapterNumbers: [...new Set(affectedChapterNumbers)].filter(
      (n) => n !== ownChapterNumber,
    ),
    warnings,
  };
}

export function useBeatsAdjustment(projectId: string) {
  const beatStore = useBeatStore();

  const state = ref<AdjustmentState>({
    loading: false,
    error: null,
    affectedChapterNumbers: [],
    warnings: [],
  });

  function clearImpact() {
    state.value.affectedChapterNumbers = [];
    state.value.warnings = [];
  }

  async function handleAdjustBeat(beatId: string, feedback: string) {
    state.value.loading = true;
    state.value.error = null;
    try {
      const response = await adjustBeat(projectId, beatId, feedback);

      // Update the beat in the store
      const beatIndex = beatStore.beats.findIndex((b) => b.id === beatId);
      if (beatIndex >= 0) {
        beatStore.beats[beatIndex] = { ...beatStore.beats[beatIndex], ...response.beat, status: response.beat.status as Beat['status'] };
      }

      // Set impact from response
      state.value.affectedChapterNumbers = response.impact.affectedChapterNumbers;
      state.value.warnings = response.impact.warnings;
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '调整失败';
    } finally {
      state.value.loading = false;
    }
  }

  async function handleBatchAdjust(
    startChapter: number,
    endChapter: number,
    problemDescription: string,
  ) {
    state.value.loading = true;
    state.value.error = null;
    try {
      const response = await batchAdjustBeats(projectId, startChapter, endChapter, problemDescription);

      // Update beats in the store
      for (const updatedBeat of response.beats) {
        const idx = beatStore.beats.findIndex((b) => b.id === updatedBeat.id);
        if (idx >= 0) {
          beatStore.beats[idx] = { ...beatStore.beats[idx], ...updatedBeat, status: updatedBeat.status as Beat['status'] };
        }
      }

      state.value.affectedChapterNumbers = response.impact.affectedChapterNumbers;
      state.value.warnings = response.impact.warnings;
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '批量优化失败';
    } finally {
      state.value.loading = false;
    }
  }

  async function handleWordCountUpdate(beatId: string, wordCount: number) {
    try {
      const updated = await updateBeatWordCount(beatId, wordCount);
      const idx = beatStore.beats.findIndex((b) => b.id === beatId);
      if (idx >= 0) {
        beatStore.beats[idx] = { ...beatStore.beats[idx], ...updated, status: updated.status as Beat['status'] };
      }
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '保存字数失败';
    }
  }

  async function handleStructureUpdate(beatId: string, plan: Record<string, unknown>) {
    try {
      const updated = await updateBeatStructure(beatId, plan);
      const idx = beatStore.beats.findIndex((b) => b.id === beatId);
      if (idx >= 0) {
        beatStore.beats[idx] = { ...beatStore.beats[idx], ...updated, status: updated.status as Beat['status'] };
      }
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '保存结构失败';
    }
  }

  return {
    state,
    clearImpact,
    handleAdjustBeat,
    handleBatchAdjust,
    handleWordCountUpdate,
    handleStructureUpdate,
  };
}
