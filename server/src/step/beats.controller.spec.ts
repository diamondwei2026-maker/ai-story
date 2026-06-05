import { Test, TestingModule } from '@nestjs/testing';
import { BeatsController, BeatModificationController } from './beats.controller';
import { StepService } from './step.service';
import { BeatData, StepData } from './step.entity';

const mockBeat: BeatData = {
  id: 'beat-1',
  projectId: 'proj-1',
  chapterNumber: 1,
  plan: { conflictPoint: '冲突', hookPresets: ['钩子1', '钩子2'] },
  targetWordCount: 3000,
  hookCount: 2,
  isClimax: false,
  useR1: false,
  status: 'PENDING',
  narrativeSummary: '',
  conflictDescription: '',
  pacingLabel: '中',
  hookCausalChain: [],
  conflictIntensity: 3,
  readerExpectation: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStep: StepData = {
  id: 'step-1',
  projectId: 'proj-1',
  phaseType: 'BEATS',
  status: 'AWAITING_REVIEW',
  input: 'outline test',
  output: 'generated beats',
  review: { beatCount: 5 },
  version: 1,
  confirmedAt: null,
};

const mockImpact = {
  affectedChapterNumbers: [3],
  warnings: ['第3章引用了已删除的钩子"钩子2"'],
};

const mockStepService = {
  generateBeats: jest.fn().mockResolvedValue([mockBeat]),
  confirmBeats: jest.fn().mockResolvedValue({
    ...mockStep,
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  }),
  rejectBeats: jest.fn().mockResolvedValue({
    ...mockStep,
    status: 'REJECTED',
  }),
  getBeatsByProjectId: jest.fn().mockReturnValue([mockBeat]),
  updateBeatWordCount: jest.fn().mockResolvedValue({
    ...mockBeat,
    targetWordCount: 5000,
    status: 'STALE',
  }),
  updateBeatStructure: jest.fn().mockResolvedValue({
    ...mockBeat,
    plan: { conflictPoint: '新冲突' },
    status: 'STALE',
  }),
  adjustBeat: jest.fn().mockResolvedValue({
    beat: { ...mockBeat, status: 'STALE', narrativeSummary: '调整后的叙事摘要' },
    impact: mockImpact,
  }),
  batchAdjustBeats: jest.fn().mockResolvedValue({
    beats: [{ ...mockBeat, status: 'STALE' }],
    impact: { affectedChapterNumbers: [], warnings: [] },
  }),
};

describe('BeatsController', () => {
  let controller: BeatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeatsController],
      providers: [{ provide: StepService, useValue: mockStepService }],
    }).compile();

    controller = module.get<BeatsController>(BeatsController);
    jest.clearAllMocks();
  });

  // ─── POST generate ───────────────────────────────────────

  describe('POST /projects/:projectId/steps/beats/generate', () => {
    it('should delegate to stepService.generateBeats', async () => {
      const body = { outline: '大纲内容', currentContent: '用户编辑' };
      const result = await controller.generate('proj-1', body);

      expect(mockStepService.generateBeats).toHaveBeenCalledWith('proj-1', body);
      expect(result).toHaveLength(1);
      expect(result[0].chapterNumber).toBe(1);
    });

    it('should return BeatData array', async () => {
      const result = await controller.generate('proj-1', { outline: 'test' });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('chapterNumber');
      expect(result[0]).toHaveProperty('hookCount');
      expect(result[0]).toHaveProperty('isClimax');
    });
  });

  // ─── POST confirm ────────────────────────────────────────

  describe('POST /projects/:projectId/steps/beats/confirm', () => {
    it('should delegate to stepService.confirmBeats', async () => {
      const result = await controller.confirm('proj-1');

      expect(mockStepService.confirmBeats).toHaveBeenCalledWith('proj-1');
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmedAt).toBeInstanceOf(Date);
    });

    it('should return StepData with phaseType BEATS', async () => {
      const result = await controller.confirm('proj-1');

      expect(result.phaseType).toBe('BEATS');
    });
  });

  // ─── POST reject ─────────────────────────────────────────

  describe('POST /projects/:projectId/steps/beats/reject', () => {
    it('should delegate to stepService.rejectBeats', async () => {
      const result = await controller.reject('proj-1');

      expect(mockStepService.rejectBeats).toHaveBeenCalledWith('proj-1');
      expect(result.status).toBe('REJECTED');
    });

    it('should return StepData', async () => {
      const result = await controller.reject('proj-1');

      expect(result.phaseType).toBe('BEATS');
    });
  });

  // ─── GET beats ───────────────────────────────────────────

  describe('GET /projects/:projectId/steps/beats', () => {
    it('should delegate to stepService.getBeatsByProjectId', async () => {
      const result = await controller.getPhaseData('proj-1');

      expect(mockStepService.getBeatsByProjectId).toHaveBeenCalledWith('proj-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no beats exist', async () => {
      mockStepService.getBeatsByProjectId.mockReturnValueOnce([]);

      const result = await controller.getPhaseData('empty-proj');
      expect(result).toEqual([]);
    });

    it('should return BeatData array on success', async () => {
      const result = await controller.getPhaseData('proj-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].projectId).toBe('proj-1');
    });
  });

  // ─── Issue #26 Phase 0: Beat V2 fields in responses ──────

  describe('BeatsController — V2 fields', () => {
    it('should return BeatData with narrativeSummary field on generate', async () => {
      const result = await controller.generate('proj-1', { outline: 'test' });

      expect(result[0]).toHaveProperty('narrativeSummary');
      expect(result[0]).toHaveProperty('conflictDescription');
      expect(result[0]).toHaveProperty('pacingLabel');
      expect(result[0]).toHaveProperty('hookCausalChain');
      expect(result[0]).toHaveProperty('conflictIntensity');
      expect(result[0]).toHaveProperty('readerExpectation');
    });

    it('should return BeatData with V2 fields on GET', async () => {
      const result = await controller.getPhaseData('proj-1');

      expect(result[0]).toHaveProperty('narrativeSummary');
      expect(result[0]).toHaveProperty('conflictDescription');
      expect(result[0]).toHaveProperty('pacingLabel');
      expect(result[0]).toHaveProperty('hookCausalChain');
      expect(result[0]).toHaveProperty('conflictIntensity');
      expect(result[0]).toHaveProperty('readerExpectation');
    });

    it('should pass targetChapterCount to generateBeats from request body', async () => {
      const body = { outline: '大纲', targetChapterCount: 40, defaultWordCount: 3000 };
      await controller.generate('proj-1', body);

      expect(mockStepService.generateBeats).toHaveBeenCalledWith('proj-1', body);
    });
  });
});

describe('BeatModificationController', () => {
  let controller: BeatModificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeatModificationController],
      providers: [{ provide: StepService, useValue: mockStepService }],
    }).compile();

    controller = module.get<BeatModificationController>(BeatModificationController);
    jest.clearAllMocks();
  });

  // ─── PATCH wordcount ─────────────────────────────────────

  describe('PATCH /beats/:id/wordcount', () => {
    it('should delegate to stepService.updateBeatWordCount', async () => {
      const result = await controller.updateWordCount('beat-1', { wordCount: 5000 });

      expect(mockStepService.updateBeatWordCount).toHaveBeenCalledWith('beat-1', 5000);
      expect(result.targetWordCount).toBe(5000);
      expect(result.status).toBe('STALE');
    });

    it('should return updated BeatData', async () => {
      const result = await controller.updateWordCount('beat-1', { wordCount: 6000 });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('targetWordCount');
    });
  });

  // ─── PATCH structure ─────────────────────────────────────

  describe('PATCH /beats/:id/structure', () => {
    it('should delegate to stepService.updateBeatStructure', async () => {
      const newPlan = { conflictPoint: '新冲突点', hookPresets: ['钩子A'] };
      const result = await controller.updateStructure('beat-1', newPlan);

      expect(mockStepService.updateBeatStructure).toHaveBeenCalledWith('beat-1', newPlan);
      expect(result.status).toBe('STALE');
    });

    it('should return updated BeatData with merged plan', async () => {
      const result = await controller.updateStructure('beat-1', { conflictPoint: '变更' });

      expect(result).toHaveProperty('plan');
      expect(result.plan).toHaveProperty('conflictPoint', '新冲突');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Issue #26 Phase 1: Adjust & Batch-Adjust Endpoints
// ═══════════════════════════════════════════════════════════════

describe('BeatsController — Issue #26 Phase 1', () => {
  let controller: BeatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeatsController],
      providers: [{ provide: StepService, useValue: mockStepService }],
    }).compile();

    controller = module.get<BeatsController>(BeatsController);
    jest.clearAllMocks();
  });

  // ─── POST adjustBeat ────────────────────────────────────────

  describe('POST /projects/:pid/steps/beats/:beatId/adjust', () => {
    it('should delegate to stepService.adjustBeat with feedback', async () => {
      const result = await controller.adjustBeat('proj-1', 'beat-1', {
        feedback: '节奏快一点',
      });

      expect(mockStepService.adjustBeat).toHaveBeenCalledWith(
        'proj-1',
        'beat-1',
        '节奏快一点',
      );
      expect(result).toHaveProperty('beat');
      expect(result).toHaveProperty('impact');
    });

    it('should return beat with STALE status', async () => {
      const result = await controller.adjustBeat('proj-1', 'beat-1', {
        feedback: '增加冲突',
      });

      expect(result.beat.status).toBe('STALE');
    });

    it('should return impact with affectedChapterNumbers and warnings', async () => {
      const result = await controller.adjustBeat('proj-1', 'beat-1', {
        feedback: '换了钩子',
      });

      expect(result.impact).toHaveProperty('affectedChapterNumbers');
      expect(result.impact).toHaveProperty('warnings');
      expect(Array.isArray(result.impact.affectedChapterNumbers)).toBe(true);
      expect(Array.isArray(result.impact.warnings)).toBe(true);
    });

    it('should pass natural language feedback verbatim', async () => {
      const feedback = '让反派在这一章提前出场，增加悬念感';
      await controller.adjustBeat('proj-1', 'beat-1', { feedback });

      expect(mockStepService.adjustBeat).toHaveBeenCalledWith(
        'proj-1',
        'beat-1',
        feedback,
      );
    });
  });

  // ─── POST batchAdjustBeats ──────────────────────────────────

  describe('POST /projects/:pid/steps/beats/batch-adjust', () => {
    it('should delegate to stepService.batchAdjustBeats with range and problem', async () => {
      const body = {
        startChapter: 2,
        endChapter: 5,
        problemDescription: '第2-5章冲突强度太低',
      };

      const result = await controller.batchAdjustBeats('proj-1', body);

      expect(mockStepService.batchAdjustBeats).toHaveBeenCalledWith(
        'proj-1',
        2,
        5,
        '第2-5章冲突强度太低',
      );
      expect(result).toHaveProperty('beats');
      expect(result).toHaveProperty('impact');
    });

    it('should return array of beats', async () => {
      const result = await controller.batchAdjustBeats('proj-1', {
        startChapter: 1,
        endChapter: 3,
        problemDescription: '优化节奏',
      });

      expect(Array.isArray(result.beats)).toBe(true);
    });

    it('should return impact with valid structure', async () => {
      const result = await controller.batchAdjustBeats('proj-1', {
        startChapter: 1,
        endChapter: 3,
        problemDescription: '优化',
      });

      expect(result.impact).toHaveProperty('affectedChapterNumbers');
      expect(result.impact).toHaveProperty('warnings');
      expect(Array.isArray(result.impact.affectedChapterNumbers)).toBe(true);
    });
  });
});
