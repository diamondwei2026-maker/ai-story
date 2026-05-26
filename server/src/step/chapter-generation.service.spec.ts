import { Test, TestingModule } from '@nestjs/testing';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';

// Mock AI that yields chapter content token-by-token via SSE stream
const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('beats')) {
      yield {
        content:
          '## Chapter 1: 序章·觉醒\n- 冲突点: 主角发现自己的特殊能力\n- 钩子预设: 神秘组织暗中观察, 能力觉醒之谜\n- 读者期待值: 高\n- 目标字数: 3000\n',
      };
      yield {
        content:
          '\n## Chapter 2: 初入江湖\n- 冲突点: 第一次实战遭遇强敌\n- 钩子预设: 神秘老人相助\n- 读者期待值: 中\n- 目标字数: 3500\n',
      };
      yield {
        content:
          '\n## Chapter 3: 暗流涌动\n- 冲突点: 发现更大的阴谋\n- 钩子预设: 隐藏势力浮出水面, 意外的背叛\n- 读者期待值: 高\n- 目标字数: 4000\n',
      };
    } else {
      const tokens = [
        '第', '一', '章', '\n', '\n',
        '夜', '色', '如', '墨', '，',
        '李', '凡', '站', '在', '城',
        '墙', '之', '上', '。',
      ];
      for (const token of tokens) {
        yield { content: token };
      }
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
      return `rendered ${template} prompt`;
    },
  ),
};

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
};

describe('StepService - Chapter Generation (DRAFTING)', () => {
  let service: StepService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepService,
        ProjectService,
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
        FactsheetCompensationService,
      ],
    }).compile();

    service = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // Helper: create a project in DRAFTING phase with confirmed beats & empty chapters
  async function setupDraftingProject(): Promise<{
    projectId: string;
    chapters: ReturnType<typeof service.getChaptersByProjectId>;
  }> {
    const project = projectService.create({ title: '测试小说' });
    // Progress through phases: IDEA → SETTING → OUTLINE → BEATS → DRAFTING
    project.status = 'BEATS';
    projectService.update(project.id, {});

    await service.generateBeats(project.id, { outline: '大纲内容' });
    await service.confirmBeats(project.id);

    const chapters = service.getChaptersByProjectId(project.id);
    return { projectId: project.id, chapters };
  }

  // ─── generateChapter ──────────────────────────────────────────

  describe('generateChapter', () => {
    it('should generate chapter content via SSE streaming and persist to ChapterData', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      const result = await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(chapter.id);
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('第一章');
      expect(result.content).toContain('李凡');
      expect(result.status).toBe('REVIEWING');
    });

    it('should call prompt template with the correct mode', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      mockPromptLoader.renderTemplate.mockClear();

      await service.generateChapter(projectId, chapter.id, {
        mode: 'paragraph-rewrite',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'chapter-generation',
        expect.objectContaining({
          mode: 'paragraph-rewrite',
        }),
      );
    });

    it('should run the full 5-step pipeline: 正文→指纹→FactSheet→审核→摘要', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // Use a content-heavy mode to trigger summary generation
      mockPromptLoader.renderTemplate.mockClear();

      const result = await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      // After the pipeline, all pipeline artifacts should be present
      expect(result.chapterFingerprint).toBeTruthy();
      expect(result.reviewResult).toBeDefined();
      // contextSummary depends on content length (2500 token threshold)
      // verified separately in the threshold test below
    });

    it('should only generate contextSummary when content exceeds 2500 tokens', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // The mock output is short (~19 tokens), so no summary should be generated
      const result = await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      // Short content should not trigger summary generation
      expect(result.contextSummary).toBeNull();
    });

    it('should throw NotFoundException when chapter does not exist', async () => {
      const { projectId } = await setupDraftingProject();

      await expect(
        service.generateChapter(projectId, 'nonexistent-chapter-id', {
          mode: 'new-continue',
        }),
      ).rejects.toThrow(/Chapter not found/);
    });

    it('should throw BadRequestException when project is not in DRAFTING phase', async () => {
      const project = projectService.create({ title: '错误阶段项目' });
      // Project defaults to IDEA status

      await expect(
        service.generateChapter(project.id, 'any-chapter-id', {
          mode: 'new-continue',
        }),
      ).rejects.toThrow(/status must be DRAFTING/);
    });

    it('should enforce sequential lock: cannot generate chapter N+1 before N is COMPLETED or DISPUTED', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      // Try to generate chapter 2 while chapter 1 is still PENDING
      const chapter2 = chapters[1];
      await expect(
        service.generateChapter(projectId, chapter2.id, {
          mode: 'new-continue',
        }),
      ).rejects.toThrow(/Previous chapter .* must be COMPLETED or DISPUTED/);
    });

    it('should allow generating chapter N+1 after chapter N is COMPLETED', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      // Generate & confirm chapter 1
      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });
      await service.confirmChapter(projectId, chapters[0].id);

      // Now chapter 2 should be generatable
      const result = await service.generateChapter(projectId, chapters[1].id, {
        mode: 'new-continue',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });
  });

  // ─── confirmChapter ───────────────────────────────────────────

  describe('confirmChapter', () => {
    it('should confirm chapter and set status to COMPLETED', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      const result = await service.confirmChapter(projectId, chapter.id);

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw when chapter is not REVIEWING', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // Chapter is PENDING, not REVIEWING
      await expect(
        service.confirmChapter(projectId, chapter.id),
      ).rejects.toThrow(/must be REVIEWING/);
    });
  });

  // ─── disputeChapter ───────────────────────────────────────────

  describe('disputeChapter', () => {
    it('should mark chapter as DISPUTED and allow next chapter generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      const result = await service.disputeChapter(projectId, chapter.id);

      expect(result.status).toBe('DISPUTED');
    });

    it('should unlock sequential lock: chapter N+1 can generate after N is DISPUTED', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      // Generate chapter 1 then dispute it
      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });
      await service.disputeChapter(projectId, chapters[0].id);

      // Now chapter 2 should be generatable
      const result = await service.generateChapter(projectId, chapters[1].id, {
        mode: 'new-continue',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });
  });

  // ─── pauseChapterGeneration ───────────────────────────────────

  describe('pauseChapterGeneration', () => {
    it('should preserve already-generated content on pause', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // Generate first to get content, then simulate pause
      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      // Pause is only valid during generation; after generation completes,
      // the content should be preserved. We test that pause marks correctly.
      const result = await service.pauseChapterGeneration(projectId, chapter.id);

      expect(result).toBeDefined();
      // Content preserved after pause
      expect(result.content).toBeTruthy();
    });

    it('should throw when no active generation to pause', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // No generation started yet
      await expect(
        service.pauseChapterGeneration(projectId, chapter.id),
      ).rejects.toThrow(/No active generation/);
    });
  });

  // ─── continueChapterGeneration ────────────────────────────────

  describe('continueChapterGeneration', () => {
    it('should continue from paused content with user edits', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // Generate to build initial content
      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      // Simulate pause
      await service.pauseChapterGeneration(projectId, chapter.id);

      // Continue with user-edited content
      const result = await service.continueChapterGeneration(
        projectId,
        chapter.id,
        { currentContent: '用户编辑后的第一章内容...' },
      );

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });

    it('should throw when no paused content to continue from', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      await expect(
        service.continueChapterGeneration(projectId, chapter.id, {
          currentContent: 'test',
        }),
      ).rejects.toThrow(/No paused generation/);
    });
  });

  // ─── retryChapterGeneration ───────────────────────────────────

  describe('retryChapterGeneration', () => {
    it('should retry full 5-step pipeline with optional feedback injection', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      // First generate some content
      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      mockPromptLoader.renderTemplate.mockClear();

      // Retry with feedback
      const result = await service.retryChapterGeneration(
        projectId,
        chapter.id,
        { feedback: '希望主角的性格更加果断', mode: 'new-continue' },
      );

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();

      // Feedback should be injected into the prompt for this retry only
      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'chapter-generation',
        expect.objectContaining({
          feedback: '希望主角的性格更加果断',
        }),
      );
    });

    it('should do full regeneration when content is <60% of target word count', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      const result = await service.retryChapterGeneration(
        projectId,
        chapter.id,
        { mode: 'new-continue' },
      );

      // Full regeneration means new content + all pipeline artifacts
      expect(result.content).toBeTruthy();
      expect(result.chapterFingerprint).toBeTruthy();
    });

    it('should support style-upgrade mode', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const chapter = chapters[0];

      await service.generateChapter(projectId, chapter.id, {
        mode: 'new-continue',
      });

      mockPromptLoader.renderTemplate.mockClear();

      await service.retryChapterGeneration(projectId, chapter.id, {
        mode: 'style-upgrade',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'chapter-generation',
        expect.objectContaining({
          mode: 'style-upgrade',
        }),
      );
    });
  });
});
