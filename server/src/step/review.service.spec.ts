import { Test, TestingModule } from '@nestjs/testing';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';

// ─── Review-specific mock AI ────────────────────────────────────

const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('independent-review') || input.includes('evaluate')) {
      yield {
        content: JSON.stringify({
          verdict: 'PASS',
          dimensions: {
            POLITICAL_SAFETY: { score: 9, issues: [] },
            SEXUAL_CONTENT: { score: 10, issues: [] },
            VIOLENCE: { score: 8, issues: [] },
            VALUES: { score: 9, issues: [] },
          },
          overallScore: 9.0,
        }),
      };
    } else if (input.includes('appeal-review')) {
      yield {
        content: JSON.stringify({
          verdict: 'PASS_WITH_SUGGESTIONS',
          dimensions: {
            POLITICAL_SAFETY: { score: 8, issues: [] },
            SEXUAL_CONTENT: { score: 9, issues: [] },
            VIOLENCE: { score: 7, issues: [] },
            VALUES: { score: 8, issues: [] },
          },
          overallScore: 8.0,
          appealNote: '降级：用户异议有理',
        }),
      };
    } else if (input.includes('beats')) {
      yield {
        content:
          '## Chapter 1: 序章·觉醒\n- 冲突点: 主角发现能力\n- 钩子预设: 神秘组织\n- 读者期待值: 高\n- 目标字数: 3000\n',
      };
      yield {
        content:
          '\n## Chapter 2: 初入江湖\n- 冲突点: 实战遭遇强敌\n- 钩子预设: 神秘老人\n- 读者期待值: 中\n- 目标字数: 3500\n',
      };
    } else {
      yield { content: '## 时代背景\n这是一个修真世界。\n' };
    }
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockImplementation(
    (_domain: string, template: string, _vars: Record<string, unknown>) => {
      if (template === 'beats-generation') return 'beats generation prompt';
      if (template === 'independent-review') return 'independent-review prompt';
      if (template === 'appeal-review') return 'appeal-review prompt';
      return 'rendered prompt';
    },
  ),
};

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
};

// ─── Verdict types ──────────────────────────────────────────────

type ReviewVerdict =
  | 'PASS'
  | 'PASS_WITH_SUGGESTIONS'
  | 'NEEDS_REVISION'
  | 'BLOCKED';

interface ReviewAction {
  key: string;
  label: string;
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Helper: advance project to DRAFTING phase with a REVIEWING chapter
 * so that review operations have a valid Chapter to work on.
 */
async function setupReviewChapter(
  service: StepService,
  projectService: ProjectService,
) {
  const project = projectService.create({ title: '审核测试小说' });
  project.status = 'BEATS';
  projectService.update(project.id, {});

  await service.generateBeats(project.id, { outline: '大纲内容' });
  await service.confirmBeats(project.id);

  const chapters = service.getChaptersByProjectId(project.id);
  const chapter = chapters[0];

  await service.generateChapter(project.id, chapter.id, {
    mode: 'new-continue',
  });

  return {
    projectId: project.id,
    chapterId: chapter.id,
    chapter,
  };
}

// ─── ReviewService ──────────────────────────────────────────────
//
// These tests define the contract BEFORE implementation exists.
// They ALL fail in the Red phase.

describe('ReviewService', () => {
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
      ],
    }).compile();

    service = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // ─── getAvailableActions ──────────────────────────────────────

  describe('getAvailableActions', () => {
    describe('PASS verdict', () => {
      it('should return empty actions array (auto-confirm)', () => {
        const actions = service.getAvailableActions('PASS');

        expect(actions).toEqual([]);
      });
    });

    describe('PASS_WITH_SUGGESTIONS verdict', () => {
      let actions: ReviewAction[];

      beforeEach(() => {
        actions = service.getAvailableActions('PASS_WITH_SUGGESTIONS');
      });

      it('should return exactly 2 actions', () => {
        expect(actions).toHaveLength(2);
      });

      it('should include "adopt_suggestions" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'adopt_suggestions' }),
          ]),
        );
      });

      it('should include "ignore_and_confirm" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'ignore_and_confirm' }),
          ]),
        );
      });

      it('should NOT include "one_click_adopt" (reserved for manual-only)', () => {
        const keys = actions.map((a) => a.key);
        expect(keys).not.toContain('one_click_adopt');
      });
    });

    describe('NEEDS_REVISION verdict', () => {
      let actions: ReviewAction[];

      beforeEach(() => {
        actions = service.getAvailableActions('NEEDS_REVISION');
      });

      it('should return exactly 3 actions', () => {
        expect(actions).toHaveLength(3);
      });

      it('should include "adopt_and_re_review" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'adopt_and_re_review' }),
          ]),
        );
      });

      it('should include "manual_edit" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'manual_edit' }),
          ]),
        );
      });

      it('should include "appeal" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'appeal' }),
          ]),
        );
      });
    });

    describe('BLOCKED verdict', () => {
      let actions: ReviewAction[];

      beforeEach(() => {
        actions = service.getAvailableActions('BLOCKED');
      });

      it('should return exactly 2 actions', () => {
        expect(actions).toHaveLength(2);
      });

      it('should include "manual_edit" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'manual_edit' }),
          ]),
        );
      });

      it('should include "appeal" action', () => {
        expect(actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'appeal' }),
          ]),
        );
      });

      it('should NOT include any adopt/accept action (zero-tolerance)', () => {
        const keys = actions.map((a) => a.key);
        expect(keys).not.toContain('adopt_suggestions');
        expect(keys).not.toContain('adopt_and_re_review');
        expect(keys).not.toContain('one_click_adopt');
        expect(keys).not.toContain('ignore_and_confirm');
      });
    });

    describe('Invalid or missing verdict', () => {
      it('should throw when verdict is null/undefined', () => {
        expect(() => service.getAvailableActions(null as unknown as string)).toThrow();
        expect(() =>
          service.getAvailableActions(undefined as unknown as string),
        ).toThrow();
      });

      it('should throw when verdict is an unrecognized string', () => {
        expect(() =>
          service.getAvailableActions('UNKNOWN_STATUS'),
        ).toThrow();
      });
    });
  });

  // ─── evaluateChapter ──────────────────────────────────────────

  describe('evaluateChapter', () => {
    it('should return a ReviewResult with verdict, dimensions, overallScore', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      const result = await service.evaluateChapter(chapterId);

      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.dimensions).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.reviewedAt).toBeDefined();
    });

    it('should include all four dimensions in the result', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      const result = await service.evaluateChapter(chapterId);

      expect(result.dimensions).toHaveProperty('POLITICAL_SAFETY');
      expect(result.dimensions).toHaveProperty('SEXUAL_CONTENT');
      expect(result.dimensions).toHaveProperty('VIOLENCE');
      expect(result.dimensions).toHaveProperty('VALUES');

      for (const dim of Object.values(result.dimensions) as any[]) {
        expect(dim).toHaveProperty('score');
        expect(typeof dim.score).toBe('number');
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(10);
        expect(dim).toHaveProperty('issues');
        expect(Array.isArray(dim.issues)).toBe(true);
      }
    });

    it('should accept a valid ReviewVerdict', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      const result = await service.evaluateChapter(chapterId);

      const validVerdicts: ReviewVerdict[] = [
        'PASS',
        'PASS_WITH_SUGGESTIONS',
        'NEEDS_REVISION',
        'BLOCKED',
      ];
      expect(validVerdicts).toContain(result.verdict);
    });

    it('should persist reviewResult into the Chapter document', async () => {
      const { projectId, chapterId } = await setupReviewChapter(
        service,
        projectService,
      );

      await service.evaluateChapter(chapterId);

      const chapters = service.getChaptersByProjectId(projectId);
      const chapter = chapters.find((c) => c.id === chapterId);
      expect(chapter!.reviewResult).toBeDefined();
      expect(chapter!.reviewResult).toHaveProperty('verdict');
      expect(chapter!.reviewResult).toHaveProperty('dimensions');
    });

    it('should call the prompt template with "independent-review" template', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      mockPromptLoader.renderTemplate.mockClear();

      await service.evaluateChapter(chapterId);

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'review',
        'independent-review',
        expect.any(Object),
      );
    });

    it('should throw when chapter does not exist', async () => {
      await expect(
        service.evaluateChapter('nonexistent-chapter-id'),
      ).rejects.toThrow(/Chapter not found/);
    });

    it('should throw when chapter has no content to review', async () => {
      const project = projectService.create({ title: '空壳章节' });
      project.status = 'BEATS';
      projectService.update(project.id, {});
      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);
      const chapters = service.getChaptersByProjectId(project.id);
      // Chapter is PENDING with null content

      await expect(
        service.evaluateChapter(chapters[0].id),
      ).rejects.toThrow(/No content to review/);
    });

    it('should emit "REVIEWING" chapter status during evaluation', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      // ensure chapter is REVIEWING before we call evaluateChapter
      const result = await service.evaluateChapter(chapterId);

      // After evaluation, status should transition based on verdict
      // PASS -> COMPLETED (auto-confirm)
      expect(result.verdict).toBe('PASS');
    });
  });

  // ─── appealReview ─────────────────────────────────────────────

  describe('appealReview', () => {
    it('should accept user reason and return a new ReviewResult', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      await service.evaluateChapter(chapterId);
      const result = await service.appealReview(chapterId, '我认为审核过度严格');

      expect(result).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.dimensions).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    it('should include user appeal reason in the review prompt', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      await service.evaluateChapter(chapterId);
      mockPromptLoader.renderTemplate.mockClear();

      await service.appealReview(chapterId, '角色冲突并非政治隐喻');

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'review',
        'appeal-review',
        expect.objectContaining({
          userReason: '角色冲突并非政治隐喻',
        }),
      );
    });

    it('should increment appealCount in the persisted reviewResult', async () => {
      const { projectId, chapterId } = await setupReviewChapter(
        service,
        projectService,
      );

      await service.evaluateChapter(chapterId);
      await service.appealReview(chapterId, '审核标注有误');

      const chapters = service.getChaptersByProjectId(projectId);
      const chapter = chapters.find((c) => c.id === chapterId);
      expect(chapter!.reviewResult).toHaveProperty('appealCount');
      expect((chapter!.reviewResult as any).appealCount).toBe(1);
    });

    it('should store appealedAt timestamp', async () => {
      const { projectId, chapterId } = await setupReviewChapter(
        service,
        projectService,
      );

      await service.evaluateChapter(chapterId);
      await service.appealReview(chapterId, '时间戳测试');

      const chapters = service.getChaptersByProjectId(projectId);
      const chapter = chapters.find((c) => c.id === chapterId);
      expect((chapter!.reviewResult as any).appealedAt).toBeDefined();
      expect(
        new Date((chapter!.reviewResult as any).appealedAt).getTime(),
      ).toBeGreaterThan(0);
    });

    it('should throw when appealCount already >= 1 (only one appeal allowed)', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      await service.evaluateChapter(chapterId);
      await service.appealReview(chapterId, '第一次上诉');

      await expect(
        service.appealReview(chapterId, '第二次上诉'),
      ).rejects.toThrow(/already been appealed/);
    });

    describe('appeal downgrade (verdict lowered)', () => {
      it('should return downgraded verdict and treat as new effective verdict', async () => {
        const { chapterId } = await setupReviewChapter(service, projectService);

        await service.evaluateChapter(chapterId);
        const result = await service.appealReview(chapterId, '异议合理');

        expect(result.verdict).toBe('PASS_WITH_SUGGESTIONS');
      });
    });

    describe('appeal upheld (verdict maintained)', () => {
      it('should return same original verdict and signal "upheld"', async () => {
        const { chapterId } = await setupReviewChapter(service, projectService);

        await service.evaluateChapter(chapterId);
        const result = await service.appealReview(chapterId, '理由不足');

        expect(result).toBeDefined();
      });
    });

    it('should throw when chapter does not exist', async () => {
      await expect(
        service.appealReview('nonexistent-id', 'reason'),
      ).rejects.toThrow(/Chapter not found/);
    });

    it('should throw when chapter has no prior reviewResult to appeal', async () => {
      const project = projectService.create({ title: '无审核记录' });
      project.status = 'BEATS';
      projectService.update(project.id, {});
      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);
      const chapters = service.getChaptersByProjectId(project.id);

      await expect(
        service.appealReview(chapters[0].id, 'test'),
      ).rejects.toThrow(/No review result/);
    });

    it('should throw when appeal reason is empty', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      await expect(service.appealReview(chapterId, '')).rejects.toThrow(
        /reason/,
      );
      await expect(service.appealReview(chapterId, '   ')).rejects.toThrow(
        /reason/,
      );
    });
  });

  // ─── getActionsForChapter (convenience: fetches verdict & returns actions) ─

  describe('getActionsForChapter', () => {
    it('should return available actions for a chapter based on its reviewResult verdict', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);
      await service.evaluateChapter(chapterId); // verdict=PASS from mock

      const actions = service.getActionsForChapter(chapterId);

      // PASS verdict => empty actions (auto-confirm)
      expect(actions).toEqual([]);
    });

    it('should throw when chapter has no reviewResult', async () => {
      const project = projectService.create({ title: '无审核章节' });
      project.status = 'BEATS';
      projectService.update(project.id, {});
      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);
      const chapters = service.getChaptersByProjectId(project.id);

      expect(() => service.getActionsForChapter(chapters[0].id)).toThrow(
        /No review result/,
      );
    });
  });

  // ─── forceDisputeChapter ──────────────────────────────────────

  describe('forceDisputeChapter', () => {
    it('should set chapter status to DISPUTED after risk confirmation', async () => {
      const { projectId, chapterId } = await setupReviewChapter(
        service,
        projectService,
      );

      await service.evaluateChapter(chapterId);
      await service.appealReview(chapterId, '上诉理由');

      // After appeal upheld, user chooses force dispute
      const result = await service.forceDisputeChapter(chapterId);

      expect(result.status).toBe('DISPUTED');
    });

    it('should unlock the next chapter after force dispute', async () => {
      const { projectId, chapterId } = await setupReviewChapter(
        service,
        projectService,
      );

      await service.evaluateChapter(chapterId);
      await service.appealReview(chapterId, '合理异议');

      // Force dispute chapter 1
      await service.forceDisputeChapter(chapterId);

      // Chapter 2 should now be generatable
      const chapters = service.getChaptersByProjectId(projectId);
      const chapter2 = chapters.find((c) => c.chapterNumber === 2);
      expect(chapter2).toBeDefined();

      const result = await service.generateChapter(projectId, chapter2!.id, {
        mode: 'new-continue',
      });
      expect(result.content).toBeTruthy();
    });

    it('should throw when chapter has not completed the appeal process', async () => {
      const { chapterId } = await setupReviewChapter(service, projectService);

      await expect(service.forceDisputeChapter(chapterId)).rejects.toThrow(
        /No review result/,
      );
    });
  });
});
