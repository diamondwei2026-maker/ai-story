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
});
