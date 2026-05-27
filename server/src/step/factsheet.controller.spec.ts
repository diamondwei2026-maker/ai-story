import { Test, TestingModule } from '@nestjs/testing';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetController } from './factsheet.controller';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';

const mockChatModel = {
  stream: async function* () { yield { content: 'mock' }; },
  getNumTokens: async () => 42,
};

const mockAiGateway = {
  generate: jest.fn(),
  callWithFallback: jest.fn(),
  getModelForTask: jest.fn().mockReturnValue('deepseek-chat-v3'),
  getFallbackModel: jest.fn().mockReturnValue(null),
  getDegradationLogs: jest.fn().mockReturnValue([]),
};

describe('FactsheetController', () => {
  let controller: FactsheetController;
  let compensationService: FactsheetCompensationService;
  let stepService: StepService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactsheetController],
      providers: [
        FactsheetCompensationService,
        ProjectService,
        StepService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: AIGatewayService, useValue: mockAiGateway },
        { provide: PromptTemplateLoaderService, useValue: { renderTemplate: jest.fn() } },
      ],
    }).compile();

    controller = module.get<FactsheetController>(FactsheetController);
    compensationService = module.get<FactsheetCompensationService>(FactsheetCompensationService);
    stepService = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  function createProject(): string {
    return projectService.create({ title: '告警测试' }).id;
  }

  // ══════════════════════════════════════════════════════════════════
  // GET /projects/:projectId/factsheet-alert
  // ══════════════════════════════════════════════════════════════════

  describe('GET :projectId/factsheet-alert', () => {
    it('should return NORMAL alert for empty queue', () => {
      const projectId = createProject();

      const result = controller.getFactsheetAlert(projectId);

      expect(result).toEqual({ level: 'NORMAL', depth: 0 });
    });

    it('should return WARNING alert when depth >= 10', () => {
      const projectId = createProject();
      for (let i = 0; i < 10; i++) {
        compensationService.enqueue(projectId, `ch${i}`, i + 1, { key: `val${i}` });
      }

      const result = controller.getFactsheetAlert(projectId);

      expect(result.level).toBe('WARNING');
      expect(result.depth).toBe(10);
    });

    it('should return CRITICAL alert when depth >= 50', () => {
      const projectId = createProject();
      for (let i = 0; i < 50; i++) {
        compensationService.enqueue(projectId, `ch${i}`, i + 1, { key: `val${i}` });
      }

      const result = controller.getFactsheetAlert(projectId);

      expect(result.level).toBe('CRITICAL');
      expect(result.depth).toBe(50);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // POST /projects/:projectId/factsheet-force-sync
  // ══════════════════════════════════════════════════════════════════

  describe('POST :projectId/factsheet-force-sync', () => {
    it('should drain the queue and write merged entries to FactSheet', () => {
      const projectId = createProject();
      compensationService.enqueue(projectId, 'ch1', 1, { a: '1', b: '2' });
      compensationService.enqueue(projectId, 'ch2', 2, { a: 'overridden', c: '3' });

      const result = controller.forceFactsheetSync(projectId);

      expect(result.consumedCount).toBe(2);
      expect(result.mergedEntries).toEqual({ a: 'overridden', b: '2', c: '3' });
      expect(compensationService.getQueueDepth(projectId)).toBe(0);

      // Verify entries were persisted to StepService's FactSheet
      const sheet = stepService.getFactsheet(projectId);
      expect(sheet).toBeDefined();
      expect((sheet!.data as any).b).toBe('2');
      expect((sheet!.data as any).c).toBe('3');
    });

    it('should return empty result when queue is empty', () => {
      const projectId = createProject();

      const result = controller.forceFactsheetSync(projectId);

      expect(result.consumedCount).toBe(0);
      expect(result.mergedEntries).toEqual({});
    });
  });
});
