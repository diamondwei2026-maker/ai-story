import { Test, TestingModule } from '@nestjs/testing';
import { Observable } from 'rxjs';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetService } from './factsheet.service';
import { ReviewService } from './review.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BEATS Generate Diagnostic', () => {
  let service: StepService;
  let promptLoader: PromptTemplateLoaderService;

  const mockPrisma = {
    stepData: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011', projectId: 'proj-1', phaseType: 'BEATS', status: 'PENDING', input: null, output: null, review: null, version: 1, confirmedAt: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    beat: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
    project: {
      findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', title: 'Test', status: 'BEATS', config: {}, pendingFactUpdates: [], statusHistory: [], createdAt: new Date(), updatedAt: new Date() }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mockProjectService = {
    findById: jest.fn().mockResolvedValue({ id: 'proj-1', title: 'Test', status: 'BEATS', config: {}, pendingFactUpdates: [], statusHistory: [], createdAt: new Date(), updatedAt: new Date() }),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockAIGateway = {
    callWithFallback: jest.fn().mockImplementation(() => {
      return new Observable((subscriber) => {
        subscriber.next({ content: '## Chapter 1: test\n', done: false, modelUsed: 'deepseek-r1', degraded: false });
        subscriber.next({ content: '冲突点: A\n钩子预设: 钩1, 钩2\n读者期待值: 高\n目标字数: 3000\n', done: true, modelUsed: 'deepseek-r1', degraded: false });
        subscriber.complete();
      });
    }),
    getModelForTask: jest.fn().mockReturnValue('deepseek-r1'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepService,
        PromptTemplateLoaderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: AIGatewayService, useValue: mockAIGateway },
        { provide: AI_MODEL_TOKEN, useValue: { stream: async function*() { yield { content: 'test' }; }, getNumTokens: async () => 10 } },
        { provide: FactsheetCompensationService, useValue: { enqueue: jest.fn(), getQueueDepth: jest.fn().mockReturnValue(0), forceSync: jest.fn(), consumeQueue: jest.fn(), applyCompensationQueue: jest.fn() } },
        { provide: FactsheetService, useValue: { getFactsheet: jest.fn().mockReturnValue(null), readFactsheet: jest.fn().mockReturnValue({ data: {}, version: 0 }), casWriteFactsheet: jest.fn().mockResolvedValue(true), forceSyncFactsheet: jest.fn(), applyCompensationQueue: jest.fn() } },
        { provide: ReviewService, useValue: { evaluateChapter: jest.fn(), appealReview: jest.fn(), getActionsForChapter: jest.fn(), getAvailableActions: jest.fn(), forceDisputeChapter: jest.fn() } },
      ],
    }).compile();

    service = module.get<StepService>(StepService);
    promptLoader = module.get<PromptTemplateLoaderService>(PromptTemplateLoaderService);
  });

  it('1. template exists and loads correctly', () => {
    const content = promptLoader.loadTemplate('creation', 'beats-generation');
    expect(content).toBeDefined();
    expect(content).toContain('{{outline}}');
    expect(content).toContain('冲突点');
    expect(content).toContain('钩子预设');
  });

  it('2. renderTemplate replaces variables', () => {
    const rendered = promptLoader.renderTemplate('creation', 'beats-generation', { outline: 'test', currentContent: '' });
    expect(rendered).toContain('test');
    expect(rendered).not.toContain('{{outline}}');
  });

  it('3. generateBeats returns BeatData[] with mock AI', async () => {
    const beats = await service.generateBeats('proj-1', { outline: 'test', currentContent: '' });
    expect(Array.isArray(beats)).toBe(true);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0]).toHaveProperty('chapterNumber');
    expect(beats[0]).toHaveProperty('plan');
    expect(beats[0]).toHaveProperty('hookCount');
  });

  it('4. throws for non-BEATS project', async () => {
    mockProjectService.findById.mockResolvedValueOnce({ id: 'proj-1', title: 'X', status: 'OUTLINE', config: {}, pendingFactUpdates: [], statusHistory: [], createdAt: new Date(), updatedAt: new Date() });
    await expect(service.generateBeats('proj-1', { outline: 'test' })).rejects.toThrow(/status must be BEATS/);
  });

  it('5. beat.create should NOT receive UUID-format IDs (IDs are DB-generated ObjectIds)', async () => {
    mockPrisma.beat.create.mockClear();

    await service.generateBeats('proj-1', { outline: 'test', currentContent: '' });

    const createCalls = mockPrisma.beat.create.mock.calls;
    expect(createCalls.length).toBeGreaterThan(0);

    for (const call of createCalls) {
      const data = call[0].data;
      if (data.id) {
        // UUID pattern: 8-4-4-4-12 hex with dashes — incompatible with MongoDB @db.ObjectId
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(data.id).not.toMatch(uuidPattern);
        // Valid MongoDB ObjectId: 24 hex chars without dashes
        expect(data.id).toMatch(/^[0-9a-f]{24}$/i);
      }
    }
  });
});
