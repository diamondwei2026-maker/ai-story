import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockChapter = {
  id: 'ch-1',
  projectId: 'proj-1',
  chapterNumber: 1,
  title: null,
  beatPlan: null,
  targetWordCount: 3000,
  content: null,
  status: 'PENDING' as const,
  chapterFingerprint: null,
  contextSummary: null,
  reviewResult: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockChapters = [
  mockChapter,
  { ...mockChapter, id: 'ch-2', chapterNumber: 2 },
  { ...mockChapter, id: 'ch-3', chapterNumber: 3 },
];

describe('useChapterStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('state initialization', () => {
    it('initializes with empty chapters array', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      expect(store.chapters).toEqual([]);
    });

    it('initializes with loading=false', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      expect(store.loading).toBe(false);
    });

    it('initializes with error=null', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      expect(store.error).toBeNull();
    });

    it('initializes with default mode "new-continue"', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      expect(store.generationMode).toBe('new-continue');
    });
  });

  describe('setChapters', () => {
    it('replaces chapters array', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      store.setChapters(mockChapters);

      expect(store.chapters).toHaveLength(3);
    });

    it('sorts chapters by chapterNumber', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      store.setChapters([mockChapters[2], mockChapters[0], mockChapters[1]]);

      expect(store.chapters[0].chapterNumber).toBe(1);
      expect(store.chapters[1].chapterNumber).toBe(2);
      expect(store.chapters[2].chapterNumber).toBe(3);
    });
  });

  describe('updateChapterContent', () => {
    it('appends token to chapter content', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();
      store.setChapters(mockChapters);

      store.updateChapterContent('ch-1', '第');
      store.updateChapterContent('ch-1', '一');
      store.updateChapterContent('ch-1', '章');

      const chapter = store.chapters.find((c) => c.id === 'ch-1');
      expect(chapter?.content).toBe('第一章');
    });
  });

  describe('updateChapterStatus', () => {
    it('updates the status of a specific chapter', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();
      store.setChapters(mockChapters);

      store.updateChapterStatus('ch-1', 'COMPLETED');

      const chapter = store.chapters.find((c) => c.id === 'ch-1');
      expect(chapter?.status).toBe('COMPLETED');
    });
  });

  describe('setGenerationMode', () => {
    it('switches the generation mode', async () => {
      const { useChapterStore } = await import('@/stores/useChapterStore');
      const store = useChapterStore();

      store.setGenerationMode('paragraph-rewrite');
      expect(store.generationMode).toBe('paragraph-rewrite');

      store.setGenerationMode('style-upgrade');
      expect(store.generationMode).toBe('style-upgrade');

      store.setGenerationMode('new-continue');
      expect(store.generationMode).toBe('new-continue');
    });
  });
});
