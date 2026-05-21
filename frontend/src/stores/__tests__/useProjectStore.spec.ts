import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

interface Project {
  id: string;
  title: string;
  status: 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED' | 'ARCHIVED';
  config: { style?: string; platform?: string; genre?: string };
  createdAt: string;
  updatedAt: string;
}

describe('useProjectStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('state initialization', () => {
    it('initializes with an empty project list', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      expect(store.projects).toEqual([]);
    });

    it('initializes with null currentProject', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      expect(store.currentProject).toBeNull();
    });
  });

  describe('setProjects', () => {
    it('replaces the project list', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      const mockProjects: Project[] = [
        { id: '1', title: '小说A', status: 'IDEA', config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: '2', title: '小说B', status: 'DRAFTING', config: {}, createdAt: '2026-01-02', updatedAt: '2026-01-02' },
      ];

      store.setProjects(mockProjects);

      expect(store.projects).toHaveLength(2);
      expect(store.projects[0].title).toBe('小说A');
    });
  });

  describe('setCurrentProject', () => {
    it('sets the current project by id when it exists in the list', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      const mockProjects: Project[] = [
        { id: '1', title: '小说A', status: 'IDEA', config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: '2', title: '小说B', status: 'DRAFTING', config: {}, createdAt: '2026-01-02', updatedAt: '2026-01-02' },
      ];
      store.setProjects(mockProjects);

      store.setCurrentProject('2');

      expect(store.currentProject).not.toBeNull();
      expect(store.currentProject!.title).toBe('小说B');
    });

    it('sets currentProject to null when id is not found', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      store.setProjects([{ id: '1', title: '小说A', status: 'IDEA', config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' }]);
      store.setCurrentProject('nonexistent');

      expect(store.currentProject).toBeNull();
    });
  });

  describe('clearCurrentProject', () => {
    it('sets currentProject to null', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      store.setProjects([{ id: '1', title: '小说A', status: 'IDEA', config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' }]);
      store.setCurrentProject('1');
      expect(store.currentProject).not.toBeNull();

      store.clearCurrentProject();

      expect(store.currentProject).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('persists project list to localStorage on change', async () => {
      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      store.setProjects([{ id: '1', title: '小说A', status: 'IDEA', config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' }]);

      const saved = JSON.parse(localStorage.getItem('projectStore') || '{}');
      expect(saved.projects).toHaveLength(1);
    });

    it('rehydrates from localStorage on creation', async () => {
      const persistedData = {
        projects: [{ id: '1', title: '持久化小说', status: 'DRAFTING' as const, config: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
        currentProject: null,
      };
      localStorage.setItem('projectStore', JSON.stringify(persistedData));

      const { useProjectStore } = await import('@/stores/useProjectStore');
      const store = useProjectStore();

      expect(store.projects).toHaveLength(1);
      expect(store.projects[0].title).toBe('持久化小说');
    });
  });
});
