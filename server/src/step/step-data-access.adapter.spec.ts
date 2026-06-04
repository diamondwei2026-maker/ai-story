import { Test, TestingModule } from '@nestjs/testing';
import { StepDataAccessAdapter } from './step-data-access.adapter';
import { StepService } from './step.service';

// ─── Issue #21: StepDataAccessAdapter Green-phase tests ────────────
// All six methods now return real data via StepService async delegation.

describe('StepDataAccessAdapter', () => {
  let adapter: StepDataAccessAdapter;

  // In-memory data stores that mock StepService reads from
  const cache = {
    chapters: new Map<string, Map<string, any>>(),
    steps: new Map<string, Map<string, any>>(),
    beats: new Map<string, any[]>(),
    factsheets: new Map<string, any>(),
  };

  const projectId = 'test-project-1';
  const chapterId = 'chapter-1';

  // Mock StepService exposing async data access matching the real StepService API
  const mockStepService = {
    getChaptersByProjectId: async (pid: string) => {
      const chapters = cache.chapters.get(pid);
      return chapters ? Array.from(chapters.values()) : [];
    },

    getBeatsByProjectId: async (pid: string) => {
      return cache.beats.get(pid) ?? [];
    },

    getIdeaByProjectId: async (pid: string) => {
      return cache.steps.get(pid)?.get('IDEA') ?? null;
    },

    getSettingByProjectId: async (pid: string) => {
      return cache.steps.get(pid)?.get('SETTING') ?? null;
    },

    getFactsheet: (pid: string) => {
      return cache.factsheets.get(pid) ?? null;
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepDataAccessAdapter,
        { provide: StepService, useValue: mockStepService },
      ],
    }).compile();

    adapter = module.get<StepDataAccessAdapter>(StepDataAccessAdapter);

    // ── Seed cache with test data ───────────────────────
    cache.chapters.set(projectId, new Map());
    cache.chapters.get(projectId)!.set(chapterId, {
      id: chapterId,
      projectId,
      chapterNumber: 1,
      beatPlan: { conflictPoint: '主角觉醒', hookPreset: '神秘组织' },
      targetWordCount: 3000,
      content: '第一章正文内容...',
      contextSummary: '出场角色：主角林清音\n关键事件：穿越星际时代',
      status: 'DRAFT',
    });
    cache.chapters.get(projectId)!.set('chapter-2', {
      id: 'chapter-2',
      projectId,
      chapterNumber: 2,
      beatPlan: { conflictPoint: '修炼突破' },
      targetWordCount: 3500,
      content: null,
      contextSummary: null,
      status: 'PENDING',
    });

    cache.steps.set(projectId, new Map());
    cache.steps.get(projectId)!.set('IDEA', {
      id: 'idea-1',
      projectId,
      phaseType: 'IDEA',
      output: '## 一句话简介\n现代女医生重生星际时代，以手术刀开创医能新体系。',
    });
    cache.steps.get(projectId)!.set('SETTING', {
      id: 'setting-1',
      projectId,
      phaseType: 'SETTING',
      output: '## 核心角色卡\n### 主角：林清音\n## 世界观\n异能至上的星际文明...',
    });

    cache.beats.set(projectId, [
      {
        id: 'beat-1',
        projectId,
        chapterNumber: 1,
        plan: { conflictPoint: '主角觉醒', hookPreset: '神秘组织暗中观察' },
      },
      {
        id: 'beat-2',
        projectId,
        chapterNumber: 2,
        plan: { conflictPoint: '修炼突破' },
      },
    ]);

    cache.factsheets.set(projectId, {
      projectId,
      data: {
        '林清音': '主角，现代医学博士',
        '暗影尊者': '反派，异能垄断组织首领',
      },
      version: 3,
    });
  });

  // ─── getChapter ─────────────────────────────────────────
  describe('getChapter', () => {
    it('should return chapter data when project and chapter exist', async () => {
      const result = await adapter.getChapter(projectId, chapterId);

      expect(result).not.toBeNull();
      expect(result!.chapterNumber).toBe(1);
      expect(result!.beatPlan).toBeDefined();
      expect(result!.content).toBe('第一章正文内容...');
      expect(result!.contextSummary).toContain('林清音');
    });

    it('should return null when chapter does not exist', async () => {
      const result = await adapter.getChapter(projectId, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when project does not exist', async () => {
      const result = await adapter.getChapter('nonexistent', chapterId);
      expect(result).toBeNull();
    });
  });

  // ─── getPreviousChapter ─────────────────────────────────
  describe('getPreviousChapter', () => {
    it('should return the previous chapter (N-1)', async () => {
      const result = await adapter.getPreviousChapter(projectId, 2);

      expect(result).not.toBeNull();
      expect(result!.content).toBe('第一章正文内容...');
      expect(result!.contextSummary).toContain('林清音');
    });

    it('should return null for chapter 1 (no previous)', async () => {
      const result = await adapter.getPreviousChapter(projectId, 1);
      expect(result).toBeNull();
    });

    it('should return null when project does not exist', async () => {
      const result = await adapter.getPreviousChapter('nonexistent', 2);
      expect(result).toBeNull();
    });
  });

  // ─── getBeat ────────────────────────────────────────────
  describe('getBeat', () => {
    it('should return beat data for a given chapter number', async () => {
      const result = await adapter.getBeat(projectId, 1);

      expect(result).not.toBeNull();
      expect(result!.plan).toBeDefined();
      expect(result!.plan.conflictPoint).toBe('主角觉醒');
    });

    it('should return null when no beat for that chapter number', async () => {
      const result = await adapter.getBeat(projectId, 999);
      expect(result).toBeNull();
    });

    it('should return null when project does not exist', async () => {
      const result = await adapter.getBeat('nonexistent', 1);
      expect(result).toBeNull();
    });
  });

  // ─── getIdeaStep ────────────────────────────────────────
  describe('getIdeaStep', () => {
    it('should return IDEA step with output', async () => {
      const result = await adapter.getIdeaStep(projectId);

      expect(result).not.toBeNull();
      expect(result!.output).toBeTruthy();
      expect(result!.output).toContain('一句话简介');
      expect(result!.output).toContain('现代女医生');
    });

    it('should return null when no IDEA step exists', async () => {
      const result = await adapter.getIdeaStep('empty-project');
      expect(result).toBeNull();
    });
  });

  // ─── getSettingStep ─────────────────────────────────────
  describe('getSettingStep', () => {
    it('should return SETTING step with output', async () => {
      const result = await adapter.getSettingStep(projectId);

      expect(result).not.toBeNull();
      expect(result!.output).toBeTruthy();
      expect(result!.output).toContain('核心角色卡');
      expect(result!.output).toContain('林清音');
      expect(result!.output).toContain('世界观');
    });

    it('should return null when no SETTING step exists', async () => {
      const result = await adapter.getSettingStep('empty-project');
      expect(result).toBeNull();
    });
  });

  // ─── getFactsheet ───────────────────────────────────────
  describe('getFactsheet', () => {
    it('should return factsheet entries', async () => {
      const result = await adapter.getFactsheet(projectId);

      expect(result).not.toBeNull();
      expect(result!.entries).toBeDefined();
      expect(result!.entries['林清音']).toBe('主角，现代医学博士');
      expect(result!.entries['暗影尊者']).toBe('反派，异能垄断组织首领');
    });

    it('should return null when no factsheet exists', async () => {
      const result = await adapter.getFactsheet('empty-project');
      expect(result).toBeNull();
    });
  });

  // ─── Interface contract: all six methods exist ──────────
  describe('interface contract', () => {
    it('should expose getChapter', () => {
      expect(typeof adapter.getChapter).toBe('function');
    });

    it('should expose getPreviousChapter', () => {
      expect(typeof adapter.getPreviousChapter).toBe('function');
    });

    it('should expose getBeat', () => {
      expect(typeof adapter.getBeat).toBe('function');
    });

    it('should expose getIdeaStep', () => {
      expect(typeof adapter.getIdeaStep).toBe('function');
    });

    it('should expose getSettingStep', () => {
      expect(typeof adapter.getSettingStep).toBe('function');
    });

    it('should expose getFactsheet', () => {
      expect(typeof adapter.getFactsheet).toBe('function');
    });
  });
});
