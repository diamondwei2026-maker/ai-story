import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED';
type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED';

const MOCK_PROJECT_ID = 'test-project-1';
const SCOPED_KEY = `workflowStore:${MOCK_PROJECT_ID}`;

describe('useWorkflowStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('state initialization', () => {
    it('initializes with IDEA current phase and all PENDING step statuses when no data exists', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      expect(store.currentPhase).toBe('IDEA');

      const phases: PhaseType[] = ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'];
      phases.forEach((phase) => {
        expect(store.getStepStatus(phase)).toBe('PENDING');
      });
    });

    it('re-initializes fresh when switching to a new project', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      // Prime project A with some state
      store.loadForProject('project-a');
      store.setCurrentPhase('OUTLINE');
      store.setStepStatus('SETTING', 'CONFIRMED');

      // Switch to project B — should get fresh defaults
      store.loadForProject('project-b');

      expect(store.currentPhase).toBe('IDEA');
      expect(store.getStepStatus('SETTING')).toBe('PENDING');
    });
  });

  describe('phase ordering', () => {
    it('returns the correct phase order', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      expect(store.phaseOrder).toEqual(['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING']);
    });

    it('returns correct phase index for each phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      expect(store.getPhaseIndex('IDEA')).toBe(0);
      expect(store.getPhaseIndex('SETTING')).toBe(1);
      expect(store.getPhaseIndex('OUTLINE')).toBe(2);
      expect(store.getPhaseIndex('BEATS')).toBe(3);
      expect(store.getPhaseIndex('DRAFTING')).toBe(4);
    });
  });

  describe('setCurrentPhase', () => {
    it('updates the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setCurrentPhase('OUTLINE');

      expect(store.currentPhase).toBe('OUTLINE');
    });
  });

  describe('setStepStatus', () => {
    it('updates step status for a given phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setStepStatus('IDEA', 'CONFIRMED');

      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');
    });

    it('does not affect other phases when updating one', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setStepStatus('IDEA', 'CONFIRMED');

      expect(store.getStepStatus('SETTING')).toBe('PENDING');
    });
  });

  describe('isPhaseAccessible', () => {
    it('returns true for the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('OUTLINE')).toBe(true);
    });

    it('returns true for phases before the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('IDEA')).toBe(true);
      expect(store.isPhaseAccessible('SETTING')).toBe(true);
    });

    it('returns false for phases after the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('BEATS')).toBe(false);
      expect(store.isPhaseAccessible('DRAFTING')).toBe(false);
    });
  });

  describe('project-scoped persistence', () => {
    it('persists to a project-scoped localStorage key', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      store.setCurrentPhase('SETTING');
      store.setStepStatus('IDEA', 'CONFIRMED');

      const saved = JSON.parse(localStorage.getItem(SCOPED_KEY) || '{}');
      expect(saved.currentPhase).toBe('SETTING');
    });

    it('rehydrates from the project-scoped key on loadForProject', async () => {
      const persisted = {
        currentPhase: 'OUTLINE',
        stepStatuses: {
          IDEA: 'CONFIRMED',
          SETTING: 'CONFIRMED',
          OUTLINE: 'IN_PROGRESS',
          BEATS: 'PENDING',
          DRAFTING: 'PENDING',
          COMPLETED: 'PENDING',
        },
      };
      localStorage.setItem(SCOPED_KEY, JSON.stringify(persisted));

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      expect(store.currentPhase).toBe('OUTLINE');
      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');
    });

    it('isolates state between different projects', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      // Project A
      store.loadForProject('project-a');
      store.setCurrentPhase('OUTLINE');
      store.setStepStatus('SETTING', 'CONFIRMED');
      store.setStepStatus('OUTLINE', 'IN_PROGRESS');

      // Project B — fresh state
      store.loadForProject('project-b');

      expect(store.currentPhase).toBe('IDEA');
      expect(store.getStepStatus('SETTING')).toBe('PENDING');
      expect(store.getStepStatus('OUTLINE')).toBe('PENDING');

      // Project A — restored
      store.loadForProject('project-a');

      expect(store.currentPhase).toBe('OUTLINE');
      expect(store.getStepStatus('SETTING')).toBe('CONFIRMED');
      expect(store.getStepStatus('OUTLINE')).toBe('IN_PROGRESS');
    });

    it('migrates legacy global key to scoped key on first load', async () => {
      // Simulate old data format
      const legacy = {
        currentPhase: 'SETTING',
        stepStatuses: {
          IDEA: 'CONFIRMED',
          SETTING: 'IN_PROGRESS',
          OUTLINE: 'PENDING',
          BEATS: 'PENDING',
          DRAFTING: 'PENDING',
          COMPLETED: 'PENDING',
        },
      };
      localStorage.setItem('workflowStore', JSON.stringify(legacy));

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.loadForProject(MOCK_PROJECT_ID);

      // Should load migrated data
      expect(store.currentPhase).toBe('SETTING');
      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');

      // Old key should be removed
      expect(localStorage.getItem('workflowStore')).toBeNull();

      // Scoped key should have the data
      const scoped = JSON.parse(localStorage.getItem(SCOPED_KEY) || '{}');
      expect(scoped.currentPhase).toBe('SETTING');
    });
  });
});
