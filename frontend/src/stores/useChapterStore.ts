import { defineStore } from 'pinia';
import { ref } from 'vue';
import { loadJSON, saveJSON } from './persist';

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

const STORAGE_KEY = 'chapterStore';

const FALLBACK: PersistedState = {
  chapters: [],
};

function persist(chapters: Chapter[]) {
  saveJSON(STORAGE_KEY, { chapters });
}

function sortByChapter(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export const useChapterStore = defineStore('chapterStore', () => {
  const persisted = loadJSON(STORAGE_KEY, { ...FALLBACK });

  const chapters = ref<Chapter[]>(persisted.chapters);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const generationMode = ref<GenerationMode>('new-continue');

  function setChapters(newChapters: Chapter[]) {
    chapters.value = sortByChapter(newChapters);
    persist(chapters.value);
  }

  function updateChapterContent(chapterId: string, token: string) {
    const chapter = chapters.value.find((c) => c.id === chapterId);
    if (!chapter) return;
    chapter.content = (chapter.content ?? '') + token;
    chapter.updatedAt = new Date().toISOString();
    persist(chapters.value);
  }

  function updateChapterStatus(
    chapterId: string,
    status: Chapter['status'],
  ) {
    const chapter = chapters.value.find((c) => c.id === chapterId);
    if (!chapter) return;
    chapter.status = status;
    chapter.updatedAt = new Date().toISOString();
    persist(chapters.value);
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
  };
});
