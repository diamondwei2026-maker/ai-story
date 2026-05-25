import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockBeat = {
  id: 'beat-1',
  projectId: 'proj-1',
  chapterNumber: 1,
  plan: { conflictPoint: '冲突点', hookPresets: ['钩子A', '钩子B'] },
  targetWordCount: 3000,
  hookCount: 2,
  isClimax: false,
  useR1: false,
  status: 'PENDING' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockBeats = [
  mockBeat,
  {
    ...mockBeat,
    id: 'beat-2',
    chapterNumber: 2,
    hookCount: 1,
    plan: { conflictPoint: '冲突2', hookPresets: ['钩子C'] },
  },
  {
    ...mockBeat,
    id: 'beat-3',
    chapterNumber: 3,
    hookCount: 3,
    isClimax: true,
    plan: { conflictPoint: '冲突3', hookPresets: ['钩子D', '钩子E', '钩子F'] },
  },
];

describe('useBeatStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('state initialization', () => {
    it('initializes with empty beats array', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      expect(store.beats).toEqual([]);
    });

    it('initializes with loading=false', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      expect(store.loading).toBe(false);
    });

    it('initializes with error=null', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      expect(store.error).toBeNull();
    });
  });

  describe('setBeats', () => {
    it('replaces beats array', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      store.setBeats(mockBeats);

      expect(store.beats).toHaveLength(3);
      expect(store.beats[0].chapterNumber).toBe(1);
    });

    it('sorts beats by chapterNumber after setting', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      const unsorted = [mockBeats[2], mockBeats[0], mockBeats[1]];
      store.setBeats(unsorted);

      expect(store.beats[0].chapterNumber).toBe(1);
      expect(store.beats[1].chapterNumber).toBe(2);
      expect(store.beats[2].chapterNumber).toBe(3);
    });
  });

  describe('updateBeatWordCount', () => {
    it('updates targetWordCount on the specified beat', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatWordCount('beat-1', 5000);

      const updated = store.beats.find((b) => b.id === 'beat-1');
      expect(updated?.targetWordCount).toBe(5000);
    });

    it('sets beat status to STALE after word count update', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatWordCount('beat-1', 5000);

      const updated = store.beats.find((b) => b.id === 'beat-1');
      expect(updated?.status).toBe('STALE');
    });

    it('does not affect other beats', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatWordCount('beat-1', 5000);

      const other = store.beats.find((b) => b.id === 'beat-2');
      expect(other?.targetWordCount).toBe(3000);
      expect(other?.status).toBe('PENDING');
    });
  });

  describe('updateBeatStructure', () => {
    it('merges new plan fields into the beat plan', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatStructure('beat-1', { conflictPoint: '新冲突', newField: 'custom' });

      const updated = store.beats.find((b) => b.id === 'beat-1');
      expect(updated?.plan).toMatchObject({ conflictPoint: '新冲突', newField: 'custom' });
    });

    it('sets isClimax when provided in plan', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatStructure('beat-2', { isClimax: true });

      const updated = store.beats.find((b) => b.id === 'beat-2');
      expect(updated?.isClimax).toBe(true);
    });

    it('sets beat status to STALE after structure update', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatStructure('beat-1', { conflictPoint: '变更' });

      const updated = store.beats.find((b) => b.id === 'beat-1');
      expect(updated?.status).toBe('STALE');
    });

    it('recalculates hookCount from plan.hookPresets', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();
      store.setBeats(mockBeats);

      store.updateBeatStructure('beat-1', {
        hookPresets: ['A', 'B', 'C', 'D'],
      });

      const updated = store.beats.find((b) => b.id === 'beat-1');
      expect(updated?.hookCount).toBe(4);
    });
  });

  describe('sortedBeats getter', () => {
    it('returns beats sorted by chapterNumber', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      store.setBeats([
        { ...mockBeat, id: 'b3', chapterNumber: 3 },
        { ...mockBeat, id: 'b1', chapterNumber: 1 },
        { ...mockBeat, id: 'b2', chapterNumber: 2 },
      ]);

      const sorted = store.sortedBeats;
      expect(sorted[0].chapterNumber).toBe(1);
      expect(sorted[1].chapterNumber).toBe(2);
      expect(sorted[2].chapterNumber).toBe(3);
    });
  });

  describe('localStorage persistence', () => {
    it('persists beats to localStorage after setBeats', async () => {
      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      store.setBeats(mockBeats);

      const saved = JSON.parse(localStorage.getItem('beatStore') || '{}');
      expect(saved.beats).toHaveLength(3);
    });

    it('rehydrates from localStorage on creation', async () => {
      localStorage.setItem('beatStore', JSON.stringify({ beats: mockBeats }));

      const { useBeatStore } = await import('@/stores/useBeatStore');
      const store = useBeatStore();

      expect(store.beats).toHaveLength(3);
      expect(store.beats[0].chapterNumber).toBe(1);
    });
  });
});
