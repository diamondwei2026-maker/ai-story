import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createStorePersistence } from './persist';
import { sortByChapter } from './sort';

export interface Chapter {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string | null;
  beatPlan: Record<string, unknown> | null;
  targetWordCount: number;
  content: string | null;
  status: 'PENDING' | 'DRAFT' | 'REVIEWING' | 'COMPLETED' | 'DISPUTED';
  chapterFingerprint: string | null;
  contextSummary: string | null;
  reviewResult: Record<string, unknown> | null;
  changeAnalysis: Record<string, unknown> | null;
  targetedFixHistory: TargetedFixEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TargetedFixEntry {
  patchedAt: string;
  sourceChapterId: string;
  changeFingerprint: string;
  summary: string;
}

export type GenerationMode = 'new-continue' | 'paragraph-rewrite' | 'style-upgrade';

interface PersistedState {
  chapters: Chapter[];
}

const THROTTLE_MS = 300;

const storePersist = createStorePersistence<PersistedState>('chapterStore', {
  chapters: [],
});

export const useChapterStore = defineStore('chapterStore', () => {
  const persisted = storePersist.load();

  const chapters = ref<Chapter[]>(persisted.chapters);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const generationMode = ref<GenerationMode>('new-continue');

  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      storePersist.save({ chapters: chapters.value });
    }, THROTTLE_MS);
  }

  function flushPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
      storePersist.save({ chapters: chapters.value });
    }
  }

  function setChapters(newChapters: Chapter[]) {
    chapters.value = sortByChapter(newChapters);
    storePersist.save({ chapters: chapters.value });
  }

  function updateChapterContent(chapterId: string, token: string) {
    const chapter = chapters.value.find((c) => c.id === chapterId);
    if (!chapter) return;
    chapter.content = (chapter.content ?? '') + token;
    chapter.updatedAt = new Date().toISOString();
    schedulePersist();
  }

  function updateChapterStatus(
    chapterId: string,
    status: Chapter['status'],
  ) {
    const chapter = chapters.value.find((c) => c.id === chapterId);
    if (!chapter) return;
    chapter.status = status;
    chapter.updatedAt = new Date().toISOString();
    storePersist.save({ chapters: chapters.value });
  }

  function setGenerationMode(mode: GenerationMode) {
    generationMode.value = mode;
  }

  return {
    chapters,
    loading,
    error,
    generationMode,
    setChapters,
    updateChapterContent,
    updateChapterStatus,
    setGenerationMode,
    flushPersist,
  };
});
