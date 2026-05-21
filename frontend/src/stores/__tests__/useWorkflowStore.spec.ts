import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED';
type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('state initialization', () => {
    it('initializes with IDEA as the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      expect(store.currentPhase).toBe('IDEA');
    });

    it('initializes all step statuses as PENDING', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      const phases: PhaseType[] = ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'];
      phases.forEach((phase) => {
        expect(store.getStepStatus(phase)).toBe('PENDING');
      });
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

      store.setCurrentPhase('OUTLINE');

      expect(store.currentPhase).toBe('OUTLINE');
    });
  });

  describe('setStepStatus', () => {
    it('updates step status for a given phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setStepStatus('IDEA', 'CONFIRMED');

      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');
    });

    it('does not affect other phases when updating one', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setStepStatus('IDEA', 'CONFIRMED');

      expect(store.getStepStatus('SETTING')).toBe('PENDING');
    });
  });

  describe('isPhaseAccessible', () => {
    it('returns true for the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('OUTLINE')).toBe(true);
    });

    it('returns true for phases before the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('IDEA')).toBe(true);
      expect(store.isPhaseAccessible('SETTING')).toBe(true);
    });

    it('returns false for phases after the current phase', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setCurrentPhase('OUTLINE');

      expect(store.isPhaseAccessible('BEATS')).toBe(false);
      expect(store.isPhaseAccessible('DRAFTING')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('persists workflow state to localStorage', async () => {
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      store.setCurrentPhase('SETTING');
      store.setStepStatus('IDEA', 'CONFIRMED');

      const saved = JSON.parse(localStorage.getItem('workflowStore') || '{}');
      expect(saved.currentPhase).toBe('SETTING');
    });

    it('rehydrates from localStorage on creation', async () => {
      const persisted = {
        currentPhase: 'OUTLINE',
        stepStatuses: { IDEA: 'CONFIRMED', SETTING: 'CONFIRMED', OUTLINE: 'IN_PROGRESS', BEATS: 'PENDING', DRAFTING: 'PENDING' },
      };
      localStorage.setItem('workflowStore', JSON.stringify(persisted));

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();

      expect(store.currentPhase).toBe('OUTLINE');
      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');
    });
  });
});
