import { Test, TestingModule } from '@nestjs/testing';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService, TaskType, AI_MODEL_TOKEN } from './ai-gateway.service';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';
import { ContextBudgetService } from './context-budget.service';
import { lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

const mockChatModel = {
  stream: async function* () {
    yield { content: 'mock' };
  },
  getNumTokens: async (text: string) => {
    if (!text) return 0;
    return Math.round(text.length / 4);
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn(),
};

const mockBudgetService = {
  calculateBudget: jest.fn(),
};

const collectSSE = async (obs$: any): Promise<any[]> => {
  return lastValueFrom(obs$.pipe(toArray()));
};

describe('AIGatewayController', () => {
  let controller: AIGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIGatewayController],
      providers: [
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
      ],
    }).compile();
    controller = module.get<AIGatewayController>(AIGatewayController);
  });

  describe('GET /ai/generate (SSE)', () => {
    it('should emit individual SSE MessageEvents per chunk', async () => {
      const events = await collectSSE(
        controller.generate(TaskType.CHAPTER_GENERATION, '写一个章节开头'),
      );

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].data).toBeDefined();
      expect(events[0].data.content).toBe('mock');
    });

    it('should include modelUsed in the final SSE event', async () => {
      const events = await collectSSE(
        controller.generate(TaskType.IDEA, '生成创意'),
      );

      const lastEvent = events[events.length - 1];
      expect(lastEvent.data.done).toBe(true);
      expect(lastEvent.data.modelUsed).toBeTruthy();
    });

    it('should mark degraded=false on successful generation', async () => {
      const events = await collectSSE(
        controller.generate(TaskType.CHAPTER_REWRITE, '改写这段内容'),
      );

      const lastEvent = events[events.length - 1];
      expect(lastEvent.data.degraded).toBe(false);
    });
  });

  describe('GET /ai/stream/:taskId', () => {
    it('should return stream status for a given task id', () => {
      const status = controller.getStreamStatus('task-123');
      expect(status).toBeDefined();
      expect(status.taskId).toBe('task-123');
    });

    it('should report status for active tasks', () => {
      const status = controller.getStreamStatus('active-task');
      expect(status.status).toMatch(/active|completed|failed/);
    });

    it('should indicate completion status when done', () => {
      const status = controller.getStreamStatus('completed-task');
      expect(status.status).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /ai/degradation-logs', () => {
    it('should return empty array when no degradations occurred', () => {
      const logs = controller.getDegradationLogs();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });
  });
});
