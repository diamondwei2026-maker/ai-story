import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('beats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBeats', () => {
    it('calls GET /projects/:id/steps/beats', async () => {
      const mockBeats = [
        {
          id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
          plan: { conflictPoint: '冲突' }, targetWordCount: 3000,
          hookCount: 2, isClimax: false, useR1: false,
          status: 'PENDING', createdAt: '2026-01-01', updatedAt: '2026-01-01',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeats),
      });

      const { getBeats } = await import('@/api/beats');
      const result = await getBeats('proj-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats',
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
      );
      expect(result).toEqual(mockBeats);
    });
  });

  describe('generateBeats', () => {
    it('calls POST /projects/:id/steps/beats/generate with outline', async () => {
      const mockBeats = [
        {
          id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
          plan: { conflictPoint: '冲突', hookPresets: ['钩子1'] },
          targetWordCount: 3000, hookCount: 1, isClimax: false,
          useR1: false, status: 'PENDING',
          createdAt: '2026-01-01', updatedAt: '2026-01-01',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeats),
      });

      const { generateBeats } = await import('@/api/beats');
      const result = await generateBeats('proj-1', {
        outline: '大纲内容',
        currentContent: '',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ outline: '大纲内容', currentContent: '' }),
        }),
      );
      expect(result).toEqual(mockBeats);
    });
  });

  describe('confirmBeats', () => {
    it('calls POST /projects/:id/steps/beats/confirm', async () => {
      const mockStep = {
        id: 'step-1', projectId: 'proj-1', phaseType: 'BEATS',
        status: 'CONFIRMED', output: '', review: {},
        version: 1, confirmedAt: '2026-01-01T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStep),
      });

      const { confirmBeats } = await import('@/api/beats');
      const result = await confirmBeats('proj-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/confirm',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.status).toBe('CONFIRMED');
    });
  });

  describe('rejectBeats', () => {
    it('calls POST /projects/:id/steps/beats/reject', async () => {
      const mockStep = {
        id: 'step-1', projectId: 'proj-1', phaseType: 'BEATS',
        status: 'REJECTED', output: '', review: {},
        version: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStep),
      });

      const { rejectBeats } = await import('@/api/beats');
      const result = await rejectBeats('proj-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/reject',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.status).toBe('REJECTED');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Issue #24 RED: updateBeatStructure API
  // ══════════════════════════════════════════════════════════════════

  describe('updateBeatStructure — Issue #24', () => {
    const mockBeatUpdated = {
      id: 'beat-1',
      projectId: 'proj-1',
      chapterNumber: 1,
      plan: { conflictPoint: '新冲突点', hookPresets: ['钩子A', '钩子B', '钩子C'] },
      targetWordCount: 3000,
      hookCount: 3,
      isClimax: false,
      useR1: true,
      status: 'STALE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    it('calls PATCH /beats/:id/structure with the plan body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeatUpdated),
      });

      const { updateBeatStructure } = await import('@/api/beats');
      const plan = {
        conflictPoint: '新冲突点',
        hookPresets: ['钩子A', '钩子B', '钩子C'],
      };
      const result = await updateBeatStructure('beat-1', plan);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/beats/beat-1/structure',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(plan),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual(mockBeatUpdated);
    });

    it('returns the updated Beat with STALE status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeatUpdated),
      });

      const { updateBeatStructure } = await import('@/api/beats');
      const result = await updateBeatStructure('beat-1', {
        conflictPoint: '变更',
      });

      expect(result.status).toBe('STALE');
      expect(result.id).toBe('beat-1');
    });

    it('merges hookCount correctly in the response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeatUpdated),
      });

      const { updateBeatStructure } = await import('@/api/beats');
      const result = await updateBeatStructure('beat-1', {
        hookPresets: ['钩子A', '钩子B', '钩子C'],
      });

      expect(result.hookCount).toBe(3);
      expect(result.useR1).toBe(true);
    });

    it('sets isClimax in the response when provided', async () => {
      const climaxBeat = { ...mockBeatUpdated, isClimax: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(climaxBeat),
      });

      const { updateBeatStructure } = await import('@/api/beats');
      const result = await updateBeatStructure('beat-1', { isClimax: true });

      expect(result.isClimax).toBe(true);
    });

    it('throws when the API returns an error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Beat not found' }),
      });

      const { updateBeatStructure } = await import('@/api/beats');

      await expect(
        updateBeatStructure('nonexistent-id', { conflictPoint: 'test' }),
      ).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Issue #23 RED: updateBeatWordCount API (companion to #24)
  // ══════════════════════════════════════════════════════════════════

  describe('updateBeatWordCount — Issue #23', () => {
    const mockBeatWordCountUpdated = {
      id: 'beat-1',
      projectId: 'proj-1',
      chapterNumber: 1,
      plan: { conflictPoint: '冲突' },
      targetWordCount: 5000,
      hookCount: 0,
      isClimax: false,
      useR1: false,
      status: 'STALE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    it('calls PATCH /beats/:id/wordcount with wordCount in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeatWordCountUpdated),
      });

      const { updateBeatWordCount } = await import('@/api/beats');
      const result = await updateBeatWordCount('beat-1', 5000);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/beats/beat-1/wordcount',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ wordCount: 5000 }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result.targetWordCount).toBe(5000);
      expect(result.status).toBe('STALE');
    });
  });
});
