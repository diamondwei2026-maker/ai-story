import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadJSON, saveJSON } from './persist';

export interface Beat {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: 'PENDING' | 'STALE' | 'CONFIRMED';
  createdAt: string;
  updatedAt: string;
}

interface PersistedState {
  beats: Beat[];
}

const STORAGE_KEY = 'beatStore';

const FALLBACK: PersistedState = {
  beats: [],
};

function persist(beats: Beat[]) {
  saveJSON(STORAGE_KEY, { beats });
}

function sortByChapter(beats: Beat[]): Beat[] {
  return [...beats].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function markStale(beat: Beat) {
  beat.status = 'STALE';
  beat.updatedAt = new Date().toISOString();
}

export const useBeatStore = defineStore('beatStore', () => {
  const persisted = loadJSON(STORAGE_KEY, { ...FALLBACK });

  const beats = ref<Beat[]>(persisted.beats);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sortedBeats = computed(() => sortByChapter(beats.value));

  function setBeats(newBeats: Beat[]) {
    beats.value = sortByChapter(newBeats);
    persist(beats.value);
  }

  function updateBeatWordCount(beatId: string, wordCount: number) {
    const beat = beats.value.find((b) => b.id === beatId);
    if (!beat) return;

    beat.targetWordCount = wordCount;
    markStale(beat);
    persist(beats.value);
  }

  function updateBeatStructure(beatId: string, plan: Record<string, unknown>) {
    const beat = beats.value.find((b) => b.id === beatId);
    if (!beat) return;

    beat.plan = { ...beat.plan, ...plan };
    if (plan.isClimax === true) beat.isClimax = true;

    const hookPresets = beat.plan.hookPresets;
    if (Array.isArray(hookPresets)) {
      beat.hookCount = hookPresets.length;
    }

    markStale(beat);
    persist(beats.value);
  }

  return {
    beats,
    loading,
    error,
    sortedBeats,
    setBeats,
    updateBeatWordCount,
    updateBeatStructure,
  };
});
