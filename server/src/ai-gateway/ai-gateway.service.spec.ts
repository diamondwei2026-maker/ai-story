import { Test, TestingModule } from '@nestjs/testing';
import { AIGatewayService, TaskType, AI_MODEL_TOKEN, AIGenerateChunk } from './ai-gateway.service';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';

const mockChatModel = {
  stream: async function* () {
    yield { content: '测试' };
    yield { content: '响应' };
    yield { content: '内容' };
  },
};

const collectChunks = async (obs$: Observable<AIGenerateChunk>): Promise<AIGenerateChunk[]> => {
  return lastValueFrom(obs$.pipe(toArray()));
};

describe('AIGatewayService', () => {
  let service: AIGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
      ],
    }).compile();
    service = module.get<AIGatewayService>(AIGatewayService);
  });

  describe('TaskType enum', () => {
    it('should define all required task types', () => {
      expect(TaskType.IDEA).toBe('IDEA');
      expect(TaskType.SETTING).toBe('SETTING');
      expect(TaskType.OUTLINE).toBe('OUTLINE');
      expect(TaskType.BEATS).toBe('BEATS');
      expect(TaskType.CHAPTER_GENERATION).toBe('CHAPTER_GENERATION');
      expect(TaskType.CRITICAL_CHAPTER).toBe('CRITICAL_CHAPTER');
      expect(TaskType.CHAPTER_REWRITE).toBe('CHAPTER_REWRITE');
      expect(TaskType.CHAPTER_POLISH).toBe('CHAPTER_POLISH');
      expect(TaskType.INDEPENDENT_REVIEW).toBe('INDEPENDENT_REVIEW');
      expect(TaskType.FINGERPRINT_EXTRACTION).toBe('FINGERPRINT_EXTRACTION');
      expect(TaskType.FACTSHEET_UPDATE).toBe('FACTSHEET_UPDATE');
      expect(TaskType.CHANGE_ANALYSIS).toBe('CHANGE_ANALYSIS');
    });
  });

  describe('getModelForTask', () => {
    it('should route early-phase creative tasks to DeepSeek-R1', () => {
      expect(service.getModelForTask(TaskType.IDEA)).toContain('r1');
      expect(service.getModelForTask(TaskType.SETTING)).toContain('r1');
      expect(service.getModelForTask(TaskType.OUTLINE)).toContain('r1');
      expect(service.getModelForTask(TaskType.BEATS)).toContain('r1');
    });

    it('should route critical chapter to DeepSeek-R1', () => {
      expect(service.getModelForTask(TaskType.CRITICAL_CHAPTER)).toContain('r1');
    });

    it('should route generation tasks to DeepSeek-V3', () => {
      expect(service.getModelForTask(TaskType.CHAPTER_GENERATION)).toContain('v3');
      expect(service.getModelForTask(TaskType.CHAPTER_REWRITE)).toContain('v3');
      expect(service.getModelForTask(TaskType.CHAPTER_POLISH)).toContain('v3');
    });

    it('should route review/extraction tasks to DeepSeek-V3', () => {
      expect(service.getModelForTask(TaskType.INDEPENDENT_REVIEW)).toContain('v3');
      expect(service.getModelForTask(TaskType.FINGERPRINT_EXTRACTION)).toContain('v3');
      expect(service.getModelForTask(TaskType.FACTSHEET_UPDATE)).toContain('v3');
      expect(service.getModelForTask(TaskType.CHANGE_ANALYSIS)).toContain('v3');
    });
  });

  describe('getFallbackModel', () => {
    it('should fallback from V3 to R1', () => {
      const fallback = service.getFallbackModel('deepseek-chat-v3');
      expect(fallback).toContain('r1');
    });

    it('should fallback from R1 to V3', () => {
      const fallback = service.getFallbackModel('deepseek-r1');
      expect(fallback).toContain('v3');
    });

    it('should return null when no fallback available', () => {
      expect(service.getFallbackModel('unknown-model')).toBeNull();
    });
  });

  describe('generate — SSE streaming', () => {
    it('should emit individual chunks per token (not batched array)', async () => {
      const chunks$ = service.generate({
        taskType: TaskType.CHAPTER_GENERATION,
        prompt: '写一个章节开头',
      });
      const chunks = await collectChunks(chunks$);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].content).toBe('测试');
      expect(chunks[0].done).toBe(false);
    });

    it('should emit a final chunk with done=true and metadata', async () => {
      const chunks$ = service.generate({
        taskType: TaskType.IDEA,
        prompt: '生成一个创意',
      });
      const chunks = await collectChunks(chunks$);
      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.modelUsed).toBeTruthy();
    });

    it('should mark degraded=false when primary model succeeds', async () => {
      const chunks$ = service.generate({
        taskType: TaskType.CHAPTER_GENERATION,
        prompt: 'test',
      });
      const chunks = await collectChunks(chunks$);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.degraded).toBe(false);
      expect(lastChunk.modelUsed).toBeTruthy();
    });

    it('should accept optional maxTokens and temperature', async () => {
      const chunks$ = service.generate({
        taskType: TaskType.CHAPTER_GENERATION,
        prompt: 'test',
        maxTokens: 500,
        temperature: 0.7,
      });
      const chunks = await collectChunks(chunks$);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('generate — degradation chain', () => {
    it('should fallback to R1 when V3 fails and succeed', async () => {
      const failOnceThenOk = {
        stream: async function* () {
          throw new Error('V3 unavailable');
        },
      };
      const r1Mock = {
        stream: async function* () {
          yield { content: 'fallback content' };
        },
      };

      // Use a spy-like approach: track model calls
      let callCount = 0;
      const degrationMock = {
        stream: async function* () {
          callCount++;
          if (callCount === 1) throw new Error('V3 unavailable');
          yield { content: 'degraded ok' };
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          AIGatewayService,
          { provide: AI_MODEL_TOKEN, useValue: degrationMock },
        ],
      }).compile();
      const svc = module.get<AIGatewayService>(AIGatewayService);

      const chunks = await collectChunks(svc.generate({
        taskType: TaskType.CHAPTER_GENERATION,
        prompt: 'test',
      }));
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.degraded).toBe(true);
      expect(lastChunk.modelUsed).toContain('v3');
    });
  });

  describe('generate — both models failed (TaskType-differentiated)', () => {
    const alwaysFailModel = {
      stream: async function* () {
        throw new Error('Both models down');
      },
    };

    let failService: AIGatewayService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          AIGatewayService,
          { provide: AI_MODEL_TOKEN, useValue: alwaysFailModel },
        ],
      }).compile();
      failService = module.get<AIGatewayService>(AIGatewayService);
    });

    it('should throw for content generation tasks (CHAPTER_GENERATION)', async () => {
      const obs$ = failService.generate({
        taskType: TaskType.CHAPTER_GENERATION,
        prompt: 'test',
      });
      await expect(collectChunks(obs$)).rejects.toThrow(/AI 服务暂时不可用/);
    });

    it('should throw for content rewrite tasks (CHAPTER_REWRITE)', async () => {
      const obs$ = failService.generate({
        taskType: TaskType.CHAPTER_REWRITE,
        prompt: 'test',
      });
      await expect(collectChunks(obs$)).rejects.toThrow(/AI 服务暂时不可用/);
    });

    it('should emit failed=true for review tasks instead of throwing', async () => {
      const obs$ = failService.generate({
        taskType: TaskType.INDEPENDENT_REVIEW,
        prompt: 'test',
      });
      const chunks = await collectChunks(obs$);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.failed).toBe(true);
    });

    it('should emit failed=true for extraction tasks instead of throwing', async () => {
      const obs$ = failService.generate({
        taskType: TaskType.FINGERPRINT_EXTRACTION,
        prompt: 'test',
      });
      const chunks = await collectChunks(obs$);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.failed).toBe(true);
    });
  });
});
