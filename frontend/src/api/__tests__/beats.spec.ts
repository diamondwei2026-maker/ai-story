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

  // ══════════════════════════════════════════════════════════════════
  // Issue #26 Phase 0 RED: V2 Beat fields in API types & targetChapterCount
  // ══════════════════════════════════════════════════════════════════

  describe('Issue #26 — generateBeats with targetChapterCount', () => {
    it('sends targetChapterCount in request body when provided', async () => {
      const mockBeats = [
        {
          id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
          plan: {}, targetWordCount: 3000, hookCount: 2,
          isClimax: false, useR1: false, status: 'PENDING',
          narrativeSummary: '摘要', conflictDescription: '冲突描述',
          pacingLabel: '快', hookCausalChain: [],
          conflictIntensity: 4, readerExpectation: 5,
          createdAt: '2026-01-01', updatedAt: '2026-01-01',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBeats),
      });

      const { generateBeats } = await import('@/api/beats');
      await generateBeats('proj-1', {
        outline: '大纲内容',
        targetChapterCount: 25,
        defaultWordCount: 3000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/generate',
        expect.objectContaining({ method: 'POST' }),
      );
      // Verify targetChapterCount is in the serialized body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.targetChapterCount).toBe(25);
      expect(requestBody.defaultWordCount).toBe(3000);
    });

    it('omits targetChapterCount from body when not provided', async () => {
      const mockBeats = [{ id: 'beat-1', projectId: 'proj-1', chapterNumber: 1, plan: {}, targetWordCount: 3000, hookCount: 0, isClimax: false, useR1: false, status: 'PENDING', narrativeSummary: '', conflictDescription: '', pacingLabel: '中', hookCausalChain: [], conflictIntensity: 3, readerExpectation: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' }];

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBeats) });

      const { generateBeats } = await import('@/api/beats');
      await generateBeats('proj-1', { outline: '大纲' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).not.toHaveProperty('targetChapterCount');
    });
  });

  describe('Issue #26 — BeatDataResponse V2 fields', () => {
    const mockV2Beat = {
      id: 'beat-1',
      projectId: 'proj-1',
      chapterNumber: 1,
      plan: {},
      targetWordCount: 3000,
      hookCount: 2,
      isClimax: false,
      useR1: false,
      status: 'PENDING',
      narrativeSummary: '一艘星舰的AI觉醒，主角踏上寻找真相的旅程',
      conflictDescription: '主角必须在48小时内修复星舰引擎，否则整个星区将被炸毁',
      pacingLabel: '快',
      hookCausalChain: [
        { hook: 'AI的真实身份', resolvesInChapter: 3 },
      ],
      conflictIntensity: 4,
      readerExpectation: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    it('getBeats returns V2 fields on each beat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockV2Beat]),
      });

      const { getBeats } = await import('@/api/beats');
      const result = await getBeats('proj-1');

      expect(result[0]).toHaveProperty('narrativeSummary');
      expect(result[0]).toHaveProperty('conflictDescription');
      expect(result[0]).toHaveProperty('pacingLabel');
      expect(result[0]).toHaveProperty('hookCausalChain');
      expect(result[0]).toHaveProperty('conflictIntensity');
      expect(result[0]).toHaveProperty('readerExpectation');
    });

    it('serializes hookCausalChain as an array of {hook, resolvesInChapter}', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockV2Beat]),
      });

      const { getBeats } = await import('@/api/beats');
      const result = await getBeats('proj-1');

      const chain = result[0].hookCausalChain;
      expect(Array.isArray(chain)).toBe(true);
      expect(chain[0]).toHaveProperty('hook');
      expect(chain[0]).toHaveProperty('resolvesInChapter');
      expect(typeof chain[0].hook).toBe('string');
      expect(typeof chain[0].resolvesInChapter).toBe('number');
    });

    it('conflictIntensity and readerExpectation are numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockV2Beat]),
      });

      const { getBeats } = await import('@/api/beats');
      const result = await getBeats('proj-1');

      expect(typeof result[0].conflictIntensity).toBe('number');
      expect(typeof result[0].readerExpectation).toBe('number');
      expect(result[0].conflictIntensity).toBeGreaterThanOrEqual(1);
      expect(result[0].conflictIntensity).toBeLessThanOrEqual(5);
      expect(result[0].readerExpectation).toBeGreaterThanOrEqual(1);
      expect(result[0].readerExpectation).toBeLessThanOrEqual(5);
    });

    it('pacingLabel is one of 快/中/慢', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockV2Beat]),
      });

      const { getBeats } = await import('@/api/beats');
      const result = await getBeats('proj-1');

      expect(['快', '中', '慢']).toContain(result[0].pacingLabel);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Issue #26 Phase 1 RED: adjustBeat & batchAdjustBeats API
  // ══════════════════════════════════════════════════════════════════

  describe('Issue #26 — adjustBeat', () => {
    const mockAdjustResponse = {
      beat: {
        id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
        plan: {}, targetWordCount: 3000, hookCount: 1,
        isClimax: false, useR1: false, status: 'STALE',
        narrativeSummary: '调整后的摘要',
        conflictDescription: '调整后的冲突描述',
        pacingLabel: '快', hookCausalChain: [],
        conflictIntensity: 4, readerExpectation: 5,
        createdAt: '2026-01-01', updatedAt: '2026-01-02',
      },
      impact: {
        affectedChapterNumbers: [3],
        warnings: ['第3章引用了已删除的钩子"钩子2"'],
      },
    };

    it('calls POST /projects/:pid/steps/beats/:beatId/adjust with feedback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAdjustResponse),
      });

      const { adjustBeat } = await import('@/api/beats');
      const result = await adjustBeat('proj-1', 'beat-1', '节奏快一点');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/beat-1/adjust',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ feedback: '节奏快一点' }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result.beat.status).toBe('STALE');
      expect(result.beat.narrativeSummary).toBe('调整后的摘要');
    });

    it('returns impact with affectedChapterNumbers and warnings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAdjustResponse),
      });

      const { adjustBeat } = await import('@/api/beats');
      const result = await adjustBeat('proj-1', 'beat-1', '调整钩子');

      expect(result.impact.affectedChapterNumbers).toEqual([3]);
      expect(result.impact.warnings).toHaveLength(1);
    });
  });

  describe('Issue #26 — batchAdjustBeats', () => {
    const mockBatchResponse = {
      beats: [
        {
          id: 'beat-2', projectId: 'proj-1', chapterNumber: 2,
          plan: {}, targetWordCount: 3000, hookCount: 1,
          isClimax: false, useR1: false, status: 'STALE',
          narrativeSummary: '批量优化后的摘要',
          conflictDescription: '批量优化后的冲突',
          pacingLabel: '快', hookCausalChain: [],
          conflictIntensity: 4, readerExpectation: 4,
          createdAt: '2026-01-01', updatedAt: '2026-01-02',
        },
        {
          id: 'beat-3', projectId: 'proj-1', chapterNumber: 3,
          plan: {}, targetWordCount: 3500, hookCount: 2,
          isClimax: true, useR1: true, status: 'STALE',
          narrativeSummary: '批量优化后摘要2',
          conflictDescription: '批量优化后冲突2',
          pacingLabel: '快', hookCausalChain: [],
          conflictIntensity: 5, readerExpectation: 5,
          createdAt: '2026-01-01', updatedAt: '2026-01-02',
        },
      ],
      impact: {
        affectedChapterNumbers: [4],
        warnings: ['钩子回收章节变更'],
      },
    };

    it('calls POST /projects/:pid/steps/beats/batch-adjust with range and problem', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBatchResponse),
      });

      const { batchAdjustBeats } = await import('@/api/beats');
      const result = await batchAdjustBeats('proj-1', 2, 3, '节奏优化');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/steps/beats/batch-adjust',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            startChapter: 2,
            endChapter: 3,
            problemDescription: '节奏优化',
          }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result.beats).toHaveLength(2);
      expect(result.beats[0].status).toBe('STALE');
    });

    it('returns impact with affectedChapterNumbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBatchResponse),
      });

      const { batchAdjustBeats } = await import('@/api/beats');
      const result = await batchAdjustBeats('proj-1', 2, 3, '优化');

      expect(result.impact.affectedChapterNumbers).toEqual([4]);
      expect(result.impact.warnings).toHaveLength(1);
    });
  });
});
