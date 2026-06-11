import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createStorePersistence } from './persist';
import { sortByChapter } from './sort';
import * as chapterApi from '@/api/chapter';

export interface Chapter {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string | null;
  beatPlan: Record<string, unknown> | null;
  targetWordCount: number;
  content: string | null;
  status: 'PENDING' | 'DRAFT' | 'PENDING_REVIEW' | 'REVIEWING' | 'COMPLETED' | 'DISPUTED';
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

  /** O(1) 索引：chapterId → chapter，避免频繁的 .find() 扫描 */
  const chapterIndex = ref<Map<string, Chapter>>(new Map());

  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** 重建 Map 索引（仅在数组替换时调用） */
  function rebuildIndex() {
    const map = new Map<string, Chapter>();
    for (const ch of chapters.value) {
      map.set(ch.id, ch);
    }
    chapterIndex.value = map;
  }

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
    rebuildIndex();
    storePersist.save({ chapters: chapters.value });
  }

  async function loadChapters(projectId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const list = await chapterApi.getChapters(projectId);
      chapters.value = sortByChapter(list);
      rebuildIndex();
      storePersist.save({ chapters: chapters.value });
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
    } finally {
      loading.value = false;
    }
  }

  function updateChapterContent(chapterId: string, token: string) {
    const chapter = chapterIndex.value.get(chapterId);
    if (!chapter) return;
    chapter.content = (chapter.content ?? '') + token;
    chapter.updatedAt = new Date().toISOString();
    schedulePersist();
  }

  function replaceChapterContent(chapterId: string, content: string) {
    const chapter = chapterIndex.value.get(chapterId);
    if (!chapter) return;
    chapter.content = content;
    chapter.updatedAt = new Date().toISOString();
    schedulePersist();
  }

  function updateChapterStatus(
    chapterId: string,
    status: Chapter['status'],
  ) {
    const chapter = chapterIndex.value.get(chapterId);
    if (!chapter) return;
    chapter.status = status;
    chapter.updatedAt = new Date().toISOString();
    storePersist.save({ chapters: chapters.value });
  }

  return {
    chapters,
    loading,
    error,
    setChapters,
    loadChapters,
    updateChapterContent,
    replaceChapterContent,
    updateChapterStatus,
    flushPersist,
  };
});
