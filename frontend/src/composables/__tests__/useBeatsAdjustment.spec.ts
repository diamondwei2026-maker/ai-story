import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockAdjustBeat = vi.fn();
const mockBatchAdjustBeats = vi.fn();
const mockUpdateBeatWordCount = vi.fn();
const mockUpdateBeatStructure = vi.fn();

vi.mock('@/api/beats', () => ({
  adjustBeat: (...args: any[]) => mockAdjustBeat(...args),
  batchAdjustBeats: (...args: any[]) => mockBatchAdjustBeats(...args),
  updateBeatWordCount: (...args: any[]) => mockUpdateBeatWordCount(...args),
  updateBeatStructure: (...args: any[]) => mockUpdateBeatStructure(...args),
}));

import { detectImpact, useBeatsAdjustment } from '@/composables/useBeatsAdjustment';
import type { HookCausalLink } from '@/stores/useBeatStore';

describe('detectImpact (pure function)', () => {
  it('returns empty impact when hook chains are identical', () => {
    const chain: HookCausalLink[] = [
      { hook: '钩子1: 悬念', resolvesInChapter: 3 },
      { hook: '钩子2: 谜题', resolvesInChapter: 5 },
    ];
    const result = detectImpact(chain, chain, 1);
    expect(result.affectedChapterNumbers).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('detects deleted hook with target chapter', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '钩子1', resolvesInChapter: 3 },
      { hook: '钩子2', resolvesInChapter: 5 },
    ];
    const newChain: HookCausalLink[] = [
      { hook: '钩子1', resolvesInChapter: 3 },
    ];
    const result = detectImpact(oldChain, newChain, 1);
    expect(result.affectedChapterNumbers).toContain(5);
    expect(result.warnings.some(w => w.includes('已删除') && w.includes('钩子2'))).toBe(true);
  });

  it('excludes own chapter from affected list', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '钩子1', resolvesInChapter: 1 },
    ];
    const newChain: HookCausalLink[] = [];
    const result = detectImpact(oldChain, newChain, 1);
    expect(result.affectedChapterNumbers).toEqual([]);
  });

  it('detects changed resolve target', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '钩子1', resolvesInChapter: 3 },
    ];
    const newChain: HookCausalLink[] = [
      { hook: '钩子1', resolvesInChapter: 5 },
    ];
    const result = detectImpact(oldChain, newChain, 1);
    expect(result.affectedChapterNumbers).toContain(3);
    expect(result.affectedChapterNumbers).toContain(5);
  });

  it('handles null resolvesInChapter', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '未定钩子', resolvesInChapter: null },
    ];
    const newChain: HookCausalLink[] = [
      { hook: '未定钩子', resolvesInChapter: 3 },
    ];
    const result = detectImpact(oldChain, newChain, 1);
    expect(result.affectedChapterNumbers).toContain(3);
  });

  it('handles newly added hooks with no old reference', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '旧钩子', resolvesInChapter: 3 },
    ];
    const newChain: HookCausalLink[] = [
      { hook: '新钩子', resolvesInChapter: 7 },
    ];
    // Only the old hook's chapter is affected (deleted)
    const result = detectImpact(oldChain, newChain, 1);
    expect(result.affectedChapterNumbers).toContain(3);
  });

  it('returns empty for both empty chains', () => {
    const result = detectImpact([], [], 1);
    expect(result.affectedChapterNumbers).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('deduplicates affected chapter numbers', () => {
    const oldChain: HookCausalLink[] = [
      { hook: '钩子A', resolvesInChapter: 3 },
      { hook: '钩子B', resolvesInChapter: 3 },
    ];
    const newChain: HookCausalLink[] = [
      { hook: '钩子A', resolvesInChapter: 5 },
      { hook: '钩子B', resolvesInChapter: 5 },
    ];
    const result = detectImpact(oldChain, newChain, 1);
    const count3 = result.affectedChapterNumbers.filter(n => n === 3).length;
    expect(count3).toBe(1);
  });
});

describe('useBeatsAdjustment', () => {
  const mockBeat = {
    id: 'beat-1',
    projectId: 'proj-1',
    chapterNumber: 1,
    plan: {},
    targetWordCount: 3000,
    hookCount: 2,
    isClimax: false,
    useR1: false,
    status: 'PENDING' as const,
    narrativeSummary: '',
    conflictDescription: '',
    pacingLabel: '中',
    hookCausalChain: [],
    conflictIntensity: 3,
    readerExpectation: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with clean state', async () => {
    const { useBeatStore } = await import('@/stores/useBeatStore');
    const store = useBeatStore();
    store.setBeats([mockBeat]);

    const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
    const adjustment = useBeatsAdjustment('proj-1');

    expect(adjustment.state.value.loading).toBe(false);
    expect(adjustment.state.value.error).toBeNull();
    expect(adjustment.state.value.affectedChapterNumbers).toEqual([]);
    expect(adjustment.state.value.warnings).toEqual([]);
  });

  it('clearImpact resets affectedChapterNumbers and warnings', async () => {
    const { useBeatStore } = await import('@/stores/useBeatStore');
    const store = useBeatStore();
    store.setBeats([mockBeat]);

    const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
    const adjustment = useBeatsAdjustment('proj-1');

    adjustment.state.value.affectedChapterNumbers = [3, 5];
    adjustment.state.value.warnings = ['warning'];

    adjustment.clearImpact();
    expect(adjustment.state.value.affectedChapterNumbers).toEqual([]);
    expect(adjustment.state.value.warnings).toEqual([]);
  });

  describe('handleAdjustBeat', () => {
    it('calls adjustBeat API with projectId, beatId, feedback', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockAdjustBeat.mockResolvedValueOnce({
        beat: { ...mockBeat, narrativeSummary: '新摘要', status: 'STALE' },
        impact: { affectedChapterNumbers: [3], warnings: ['钩子变更'] },
      });

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleAdjustBeat('beat-1', '节奏快一点');

      expect(mockAdjustBeat).toHaveBeenCalledWith('proj-1', 'beat-1', '节奏快一点');
      expect(adjustment.state.value.affectedChapterNumbers).toEqual([3]);
      expect(adjustment.state.value.warnings).toEqual(['钩子变更']);
    });

    it('updates the beat in the store after adjust', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockAdjustBeat.mockResolvedValueOnce({
        beat: { ...mockBeat, narrativeSummary: '调整后摘要', status: 'STALE' },
        impact: { affectedChapterNumbers: [], warnings: [] },
      });

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleAdjustBeat('beat-1', '修改');

      expect(store.beats[0].narrativeSummary).toBe('调整后摘要');
      expect(store.beats[0].status).toBe('STALE');
    });

    it('sets error on failure', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockAdjustBeat.mockRejectedValueOnce(new Error('API error'));

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleAdjustBeat('beat-1', 'test');

      expect(adjustment.state.value.error).toBe('API error');
      expect(adjustment.state.value.loading).toBe(false);
    });
  });

  describe('handleBatchAdjust', () => {
    it('calls batchAdjustBeats API with range and problem description', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockBatchAdjustBeats.mockResolvedValueOnce({
        beats: [{ ...mockBeat, narrativeSummary: '优化后' }],
        impact: { affectedChapterNumbers: [4], warnings: ['钩子回收变更'] },
      });

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleBatchAdjust(2, 5, '增强冲突');

      expect(mockBatchAdjustBeats).toHaveBeenCalledWith('proj-1', 2, 5, '增强冲突');
      expect(adjustment.state.value.affectedChapterNumbers).toEqual([4]);
      expect(adjustment.state.value.warnings).toEqual(['钩子回收变更']);
    });

    it('sets error on failure', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockBatchAdjustBeats.mockRejectedValueOnce(new Error('批量失败'));

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleBatchAdjust(2, 5, '优化');

      expect(adjustment.state.value.error).toBe('批量失败');
    });
  });

  describe('handleWordCountUpdate', () => {
    it('calls updateBeatWordCount API and updates store', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockUpdateBeatWordCount.mockResolvedValueOnce({
        ...mockBeat,
        targetWordCount: 5000,
        status: 'STALE',
      });

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleWordCountUpdate('beat-1', 5000);

      expect(mockUpdateBeatWordCount).toHaveBeenCalledWith('beat-1', 5000);
      expect(store.beats[0].targetWordCount).toBe(5000);
    });

    it('sets error on word count update failure', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockUpdateBeatWordCount.mockRejectedValueOnce(new Error('保存失败'));

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleWordCountUpdate('beat-1', 5000);

      expect(adjustment.state.value.error).toBe('保存失败');
    });
  });

  describe('handleStructureUpdate', () => {
    it('calls updateBeatStructure API and updates store', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockUpdateBeatStructure.mockResolvedValueOnce({
        ...mockBeat,
        plan: { conflictPoint: '新冲突' },
        status: 'STALE',
      });

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleStructureUpdate('beat-1', { conflictPoint: '新冲突' });

      expect(mockUpdateBeatStructure).toHaveBeenCalledWith('beat-1', { conflictPoint: '新冲突' });
      expect(store.beats[0].status).toBe('STALE');
    });

    it('sets error on structure update failure', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats([mockBeat]);

      mockUpdateBeatStructure.mockRejectedValueOnce(new Error('结构更新失败'));

      const { useBeatsAdjustment } = await import('@/composables/useBeatsAdjustment');
      const adjustment = useBeatsAdjustment('proj-1');

      await adjustment.handleStructureUpdate('beat-1', { isClimax: true });

      expect(adjustment.state.value.error).toBe('结构更新失败');
    });
  });
});
