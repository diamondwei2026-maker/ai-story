import { Test, TestingModule } from '@nestjs/testing';
import { ChapterController } from './chapter.controller';
import { ChangeAnalysisService } from './change-analysis.service';
import { StepService } from './step.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { randomUUID } from 'crypto';

// ─── Mocks ───────────────────────────────────────────────────────

const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('fingerprint') || input.includes('impact')) {
      yield {
        content: JSON.stringify({
          changeFingerprint: 'mock fingerprint',
          impactedChapters: [{ chapterNumber: 2, severity: 'HIGH', reason: '冲突' }],
        }),
      };
    } else if (input.includes('targeted-fix') || input.includes('patch')) {
      yield { content: 'mock patch content' };
    } else if (input.includes('beats')) {
      yield { content: '## Chapter 1: Test\n- 冲突点: test\n- 钩子预设: test\n- 读者期待值: 高\n- 目标字数: 3000\n' };
      yield { content: '\n## Chapter 2: Test\n- 冲突点: test\n- 钩子预设: test\n- 读者期待值: 中\n- 目标字数: 3500\n' };
      yield { content: '\n## Chapter 3: Test\n- 冲突点: test\n- 钩子预设: test\n- 读者期待值: 高\n- 目标字数: 4000\n' };
    } else {
      yield { content: 'mock' };
    }
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockImplementation(
    (_domain: string, template: string, _vars: Record<string, unknown>) => {
      if (template === 'beats-generation') {
        return 'beats generation prompt with beats specific instructions';
      }
      if (template === 'chapter-generation') {
        return 'chapter generation prompt';
      }
      if (template === 'change-analysis') {
        return 'change analysis prompt with fingerprint and impact propagation';
      }
      if (template === 'targeted-fix') {
        return 'targeted fix prompt';
      }
      return 'mock prompt';
    },
  ),
};

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
};

// ─── Test Suite ───────────────────────────────────────────────────

describe('ChapterController — ChangeAnalysis endpoints', () => {
  let controller: ChapterController;
  let changeAnalysisService: ChangeAnalysisService;
  let stepService: StepService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChapterController],
      providers: [
        ChangeAnalysisService,
        StepService,
        FactsheetCompensationService,
        ProjectService,
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
      ],
    }).compile();

    controller = module.get<ChapterController>(ChapterController);
    changeAnalysisService = module.get<ChangeAnalysisService>(ChangeAnalysisService);
    stepService = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // Helper: create project with COMPLETED chapters
  async function setupProject(): Promise<{
    projectId: string;
    chapterId: string;
    chapterId2: string;
    chapterContent: string;
  }> {
    const project = projectService.create({ title: 'Controller测试' });
    project.status = 'BEATS';
    projectService.update(project.id, {});

    await stepService.generateBeats(project.id, { outline: '大纲' });
    await stepService.confirmBeats(project.id);

    const chapters = stepService.getChaptersByProjectId(project.id);

    await stepService.generateChapter(project.id, chapters[0].id, {
      mode: 'new-continue',
    });
    await stepService.confirmChapter(project.id, chapters[0].id);

    await stepService.generateChapter(project.id, chapters[1].id, {
      mode: 'new-continue',
    });
    await stepService.confirmChapter(project.id, chapters[1].id);

    const chapter = chapters[0];
    return {
      projectId: project.id,
      chapterId: chapter.id,
      chapterId2: chapters[1].id,
      chapterContent: chapter.content!,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // POST /projects/:projectId/chapters/:chapterId/analyze-change
  // ══════════════════════════════════════════════════════════════════

  describe('POST :chapterId/analyze-change', () => {
    it('should return { skipped: true } for unchanged content', async () => {
      const { projectId, chapterId, chapterContent } = await setupProject();

      const result = await controller.analyzeChange(
        projectId,
        chapterId,
        { newContent: chapterContent },
      );

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no-change');
    });

    it('should return changeAnalysis for substantive changes', async () => {
      const { projectId, chapterId } = await setupProject();

      const result = await controller.analyzeChange(
        projectId,
        chapterId,
        { newContent: '这是完全不同的章节内容，包含了大量新增的叙述和描写。' +
          '主角的性格发生了根本性的变化，从一个普通人变成了隐藏身份的王室后裔。' +
          '这个变化会影响到后续所有章节的角色互动和情节发展。' },
      );

      expect(result.skipped).toBe(false);
      expect(result.changeAnalysis).toBeDefined();
      expect(result.changeAnalysis!.impactedChapters.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // POST /projects/:projectId/chapters/:chapterId/targeted-fix
  // ══════════════════════════════════════════════════════════════════

  describe('POST :chapterId/targeted-fix', () => {
    it('should return patch content', async () => {
      const { projectId, chapterId, chapterId2 } = await setupProject();

      // First run analyzeChange to populate source changeAnalysis
      await controller.analyzeChange(
        projectId,
        chapterId,
        { newContent: '实质性变更：主角性格调整。影响第2章角色描写。' },
      );

      const result = await controller.applyTargetedFix(
        projectId,
        chapterId,
        { impactedChapterId: chapterId2 },
      );

      expect(result).toBeDefined();
      expect(result.patchContent).toBeTruthy();
    });
  });
});
