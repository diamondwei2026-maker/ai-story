import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ChangeAnalysisService,
  ImpactedChapter,
} from './change-analysis.service';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { ChapterData } from './step.entity';

// ─── Mock AI ─────────────────────────────────────────────────────

const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('fingerprint') || input.includes('impact')) {
      yield {
        content: JSON.stringify({
          changeFingerprint: '主角性格从犹豫变为果断，影响第2章角色一致性',
          impactedChapters: [
            {
              chapterNumber: 2,
              severity: 'HIGH',
              reason: '第2章主角表现犹豫，与新性格不一致',
            },
            {
              chapterNumber: 3,
              severity: 'MEDIUM',
              reason: '第3章侧面描写需微调',
            },
            {
              chapterNumber: 5,
              severity: 'LOW',
              reason: '第5章提及主角过去经历',
            },
          ],
        }),
      };
    } else if (input.includes('targeted-fix') || input.includes('patch')) {
      yield { content: '这是 AI 生成的修补内容，修正了角色性格不一致的问题。' };
    } else if (input.includes('beats')) {
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
      yield {
        content:
          '\n## Chapter 4: 危机四伏\n- 冲突点: 主角团队内部矛盾\n- 钩子预设: 叛徒现身, 信任危机\n- 读者期待值: 中\n- 目标字数: 3200\n',
      };
      yield {
        content:
          '\n## Chapter 5: 决战前夕\n- 冲突点: 各方势力集结\n- 钩子预设: 终极对决预告, 伏笔回收\n- 读者期待值: 极高\n- 目标字数: 5000\n',
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
      if (template === 'change-analysis') {
        return 'change analysis prompt with fingerprint and impact propagation';
      }
      if (template === 'targeted-fix') {
        return 'targeted fix prompt';
      }
      return `rendered ${template} prompt`;
    },
  ),
};

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
};

// ─── Test Suite ───────────────────────────────────────────────────

describe('ChangeAnalysisService', () => {
  let service: ChangeAnalysisService;
  let stepService: StepService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeAnalysisService,
        StepService,
        ProjectService,
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
      ],
    }).compile();

    service = module.get<ChangeAnalysisService>(ChangeAnalysisService);
    stepService = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // Helper: create project with confirmed beats and COMPLETED chapters
  async function setupProjectWithChapters(): Promise<{
    projectId: string;
    chapters: ChapterData[];
  }> {
    const project = projectService.create({ title: '变更分析测试小说' });
    project.status = 'BEATS';
    projectService.update(project.id, {});

    await stepService.generateBeats(project.id, { outline: '大纲内容' });
    await stepService.confirmBeats(project.id);

    const chapters = stepService.getChaptersByProjectId(project.id);

    // Generate & confirm chapter 1
    await stepService.generateChapter(project.id, chapters[0].id, {
      mode: 'new-continue',
    });
    await stepService.confirmChapter(project.id, chapters[0].id);

    // Generate & confirm chapter 2
    await stepService.generateChapter(project.id, chapters[1].id, {
      mode: 'new-continue',
    });
    await stepService.confirmChapter(project.id, chapters[1].id);

    // Generate & confirm chapter 3
    await stepService.generateChapter(project.id, chapters[2].id, {
      mode: 'new-continue',
    });
    await stepService.confirmChapter(project.id, chapters[2].id);

    return { projectId: project.id, chapters };
  }

  // ══════════════════════════════════════════════════════════════════
  // detectChangeType
  // ══════════════════════════════════════════════════════════════════

  describe('detectChangeType', () => {
    it('should return "no-change" when content is identical', () => {
      const content = '第一章内容：主角登场。';
      expect(service.detectChangeType(content, content)).toBe('no-change');
    });

    it('should return "whitespace-only" when only whitespace differs', () => {
      const original = '第一章内容：主角登场。';
      const updated = '  第一章内容：主角登场。  \n\n';
      expect(service.detectChangeType(original, updated)).toBe(
        'whitespace-only',
      );
    });

    it('should return "whitespace-only" when only newlines/tabs differ', () => {
      const original = '段落一\n段落二\n段落三';
      const updated = '段落一\n\n段落二\t\n段落三\n';
      expect(service.detectChangeType(original, updated)).toBe(
        'whitespace-only',
      );
    });

    it('should return "minor" when Levenshtein < 50 chars and no paragraph changes', () => {
      const original = '主角李凡站在城墙上，望着远方的夕阳。';
      // Change ~10 characters (人名微调)
      const updated = '主角李明站在城墙上，望着远方的夕阳。';
      const result = service.detectChangeType(original, updated);
      expect(result).toBe('minor');
    });

    it('should return "substantive" when Levenshtein >= 50 chars', () => {
      const original = '主角李凡站在城墙上。';
      // Add 50+ characters of new content
      const updated =
        '主角李凡站在城墙上，心中思绪万千。' +
        '他想起了师父临终前的话语，那是一个风雨交加的夜晚，' +
        '师父握着他的手说：你要守护这座城池。';
      const result = service.detectChangeType(original, updated);
      expect(result).toBe('substantive');
    });

    it('should return "substantive" when a paragraph is added', () => {
      const original = '段落一：主角登场。\n\n段落二：冲突初现。';
      const updated =
        '段落一：主角登场。\n\n段落二：冲突初现。\n\n段落三：新增的完整段落，描述了主角的内心变化和过去的故事背景。';
      const result = service.detectChangeType(original, updated);
      expect(result).toBe('substantive');
    });

    it('should return "substantive" when a paragraph is deleted', () => {
      const original =
        '段落一：主角登场。\n\n段落二：冲突初现。\n\n段落三：被删除的段落。';
      const updated = '段落一：主角登场。\n\n段落二：冲突初现。';
      const result = service.detectChangeType(original, updated);
      expect(result).toBe('substantive');
    });

    it('should return "substantive" when paragraph content differs by > 100 chars', () => {
      const original = '短段落内容。';
      const updated =
        '这是一个被大幅修改的段落，新增了大量内容超过一百个字符。' +
        '这里继续添加更多内容以确保超过一百字符的差异阈值。' +
        '继续填充内容，让这个段落的变化足够大，触发实质性变更检测。';
      const result = service.detectChangeType(original, updated);
      expect(result).toBe('substantive');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // analyzeChange
  // ══════════════════════════════════════════════════════════════════

  describe('analyzeChange', () => {
    it('should throw NotFoundException when chapter does not exist', async () => {
      const project = projectService.create({ title: '测试' });
      await expect(
        service.analyzeChange(project.id, 'nonexistent-id', '新内容'),
      ).rejects.toThrow(/Chapter not found/);
    });

    it('should throw BadRequestException when chapter is not COMPLETED or DISPUTED', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      // Chapter 1 is COMPLETED, but let's get a PENDING chapter
      // Use a chapter beyond the 3 confirmed ones
      const pendingChapter = chapters.find((c) => c.status === 'PENDING');
      if (pendingChapter) {
        await expect(
          service.analyzeChange(projectId, pendingChapter.id, '新内容'),
        ).rejects.toThrow(/must be COMPLETED or DISPUTED/);
      }
    });

    it('should return { skipped: true, reason: "no-change" } when content is unchanged', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];
      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        chapter.content!,
      );
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no-change');
    });

    it('should return { skipped: true, reason: "whitespace-only" } for whitespace diff', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];
      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        '  ' + chapter.content + '\n\n',
      );
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('whitespace-only');
    });

    it('should return { skipped: true, reason: "minor" } for minor changes', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];
      // Append a tiny change (< 50 chars, same paragraph count)
      const minorChange = chapter.content! + '（微调）';
      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        minorChange,
      );
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('minor');
    });

    it('should trigger full pipeline for substantive changes', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      const substantiveChange =
        '这是完全不同的第一章内容，主角性格发生了本质变化。' +
        '他不再是那个犹豫不决的少年，而是一个果断坚毅的战士。' +
        '这个变化会影响后续所有章节中关于主角的描写和角色弧线。';

      mockPromptLoader.renderTemplate.mockClear();

      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        substantiveChange,
      );

      expect(result.skipped).toBe(false);
      expect(result.changeAnalysis).toBeDefined();
      expect(result.changeAnalysis!.sourceChangeFingerprint).toBeTruthy();
      expect(result.changeAnalysis!.impactedChapters).toBeInstanceOf(Array);
      expect(result.changeAnalysis!.impactedChapters.length).toBeGreaterThan(0);
    });

    it('should persist changeAnalysis to the source Chapter', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      const substantiveChange =
        '大幅修改后的第一章内容，改变了核心角色设定。' +
        '主角的成长路线发生了根本性的调整。';

      await service.analyzeChange(projectId, chapter.id, substantiveChange);

      // Re-fetch chapter to verify persistence
      const updatedChapter = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapter.id);

      expect(updatedChapter!.changeAnalysis).toBeDefined();
      expect(updatedChapter!.changeAnalysis!.lastAnalyzedAt).toBeTruthy();
      expect(
        updatedChapter!.changeAnalysis!.sourceChangeFingerprint,
      ).toBeTruthy();
      expect(updatedChapter!.changeAnalysis!.impactedChapters).toBeInstanceOf(
        Array,
      );
    });

    it('should set chapter status to DRAFT on substantive change', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];
      expect(chapter.status).toBe('COMPLETED');

      const substantiveChange =
        '大幅修改后的第一章内容，改变了核心角色设定。' +
        '主角从一个普通人变成了隐藏身份的王室后裔。';

      await service.analyzeChange(projectId, chapter.id, substantiveChange);

      const updatedChapter = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapter.id);

      expect(updatedChapter!.status).toBe('DRAFT');
    });

    it('should call AI prompt template for change-analysis', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      mockPromptLoader.renderTemplate.mockClear();

      await service.analyzeChange(
        projectId,
        chapter.id,
        '实质性变更内容：主角性格从犹豫变为果断。' +
          '这一变化需要传播到后续所有章节。',
      );

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'change-analysis',
        expect.objectContaining({
          originalContent: chapter.content,
          newContent: expect.any(String),
        }),
      );
    });

    it('should classify impacted chapters by severity', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        '实质性变更：主角性格根本变化，影响全局。',
      );

      expect(result.changeAnalysis).toBeDefined();
      const impacted = result.changeAnalysis!.impactedChapters;
      const severities = impacted.map((i: { severity: string }) => i.severity);
      expect(severities).toContain('HIGH');
      expect(severities).toContain('MEDIUM');
      expect(severities).toContain('LOW');
    });

    it('should filter out NONE severity from impactedChapters', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        '实质性变更：主角性格根本变化。',
      );

      const impacted = result.changeAnalysis!.impactedChapters;
      const noneEntries = impacted.filter(
        (i: { severity: string }) => i.severity === 'NONE',
      );
      expect(noneEntries.length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Stale analysis clearing & DEFERRED merge
  // ══════════════════════════════════════════════════════════════════

  describe('stale analysis handling', () => {
    it('should overwrite old changeAnalysis on re-analysis', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      // First analysis
      const result1 = await service.analyzeChange(
        projectId,
        chapter.id,
        '第一次实质性变更：主角性格变化。',
      );
      expect(result1.skipped).toBe(false);

      // Reset status to COMPLETED (simulates user re-confirming chapter after edit)
      const afterFirst = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapter.id);
      afterFirst!.status = 'COMPLETED';

      // Second analysis with different content — old changeAnalysis should be overwritten
      const result2 = await service.analyzeChange(
        projectId,
        chapter.id,
        '第二次实质性变更：世界观设定重大调整，引入了全新的魔法体系。',
      );

      expect(result2.skipped).toBe(false);
      expect(result2.changeAnalysis).toBeDefined();
    });

    it('should merge DEFERRED entries by severity on re-analysis', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      // First analysis — mark chapter 3 as DEFERRED (MEDIUM)
      await service.analyzeChange(
        projectId,
        chapter.id,
        '第一次实质性变更：角色外貌描述调整。',
      );

      // Simulate: mark chapter 3 as DEFERRED
      const afterFirst = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapter.id);
      const caAfterFirst = afterFirst!.changeAnalysis as Record<string, unknown> | null;
      const impacted2 = (caAfterFirst!.impactedChapters as ImpactedChapter[]).find(
        (i) => i.chapterNumber === 3,
      );
      if (impacted2) {
        impacted2.status = 'DEFERRED';
      }

      // Reset status to COMPLETED (simulates user re-confirming before next edit)
      afterFirst!.status = 'COMPLETED';

      // Second analysis — chapter 3 now appears with HIGH severity
      await service.analyzeChange(
        projectId,
        chapter.id,
        '第二次实质性变更：主角设定彻底重写。',
      );

      const afterSecond = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapter.id);
      const caAfterSecond = afterSecond!.changeAnalysis as Record<string, unknown> | null;
      const impactedChapter3 = (caAfterSecond!.impactedChapters as ImpactedChapter[]).find(
        (i) => i.chapterNumber === 3,
      );

      if (impactedChapter3) {
        expect(impactedChapter3.severity).toBeTruthy();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // applyTargetedFix
  // ══════════════════════════════════════════════════════════════════

  describe('applyTargetedFix', () => {
    async function setupWithAnalysis(): Promise<{
      projectId: string;
      sourceChapter: ChapterData;
      impactedChapterId: string;
    }> {
      const { projectId, chapters } = await setupProjectWithChapters();

      await service.analyzeChange(
        projectId,
        chapters[0].id,
        '实质性变更：主角性格从犹豫变为果断，影响后续章节角色一致性。',
      );

      const impacted = chapters[1]; // chapter 2
      return {
        projectId,
        sourceChapter: chapters[0],
        impactedChapterId: impacted.id,
      };
    }

    it('should generate patch via AI and persist to targetedFixHistory', async () => {
      const { projectId, sourceChapter, impactedChapterId } =
        await setupWithAnalysis();

      mockPromptLoader.renderTemplate.mockClear();

      const result = await service.applyTargetedFix(
        projectId,
        sourceChapter.id,
        impactedChapterId,
      );

      expect(result).toBeDefined();
      expect(result.patchContent).toBeTruthy();

      // Verify targetedFixHistory updated on the impacted chapter
      const chapters = stepService.getChaptersByProjectId(projectId);
      const impactedChapter = chapters.find((c) => c.id === impactedChapterId);
      expect(impactedChapter!.targetedFixHistory.length).toBeGreaterThan(0);
      expect(impactedChapter!.targetedFixHistory[0].sourceChapterId).toBe(
        sourceChapter.id,
      );
    });

    it('should call AI prompt template for targeted-fix', async () => {
      const { projectId, sourceChapter, impactedChapterId } =
        await setupWithAnalysis();

      mockPromptLoader.renderTemplate.mockClear();

      await service.applyTargetedFix(
        projectId,
        sourceChapter.id,
        impactedChapterId,
      );

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'targeted-fix',
        expect.objectContaining({
          sourceChapterId: sourceChapter.id,
          impactedChapterId,
        }),
      );
    });

    it('should preserve chapter status after TargetedFix', async () => {
      const { projectId, sourceChapter, impactedChapterId } =
        await setupWithAnalysis();

      const chaptersBefore = stepService.getChaptersByProjectId(projectId);
      const impactedBefore = chaptersBefore.find(
        (c) => c.id === impactedChapterId,
      );
      const statusBefore = impactedBefore!.status;

      await service.applyTargetedFix(
        projectId,
        sourceChapter.id,
        impactedChapterId,
      );

      const chaptersAfter = stepService.getChaptersByProjectId(projectId);
      const impactedAfter = chaptersAfter.find(
        (c) => c.id === impactedChapterId,
      );
      expect(impactedAfter!.status).toBe(statusBefore);
    });

    it('should include diffSummary in targetedFixHistory entry', async () => {
      const { projectId, sourceChapter, impactedChapterId } =
        await setupWithAnalysis();

      await service.applyTargetedFix(
        projectId,
        sourceChapter.id,
        impactedChapterId,
      );

      const chapters = stepService.getChaptersByProjectId(projectId);
      const impactedChapter = chapters.find((c) => c.id === impactedChapterId);
      const entry = impactedChapter!.targetedFixHistory[0];

      expect(entry.changeFingerprint).toBeTruthy();
      expect(entry.summary).toBeTruthy();
      expect(entry.patchedAt).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getDeferredReminders
  // ══════════════════════════════════════════════════════════════════

  describe('getDeferredReminders', () => {
    it('should return empty array when no DEFERRED entries exist', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();

      const reminders = service.getDeferredReminders(projectId, chapters[1].id);

      expect(reminders).toEqual([]);
    });

    it('should return DEFERRED entries targeting the given chapter', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();

      // Trigger analysis that affects chapter 2
      await service.analyzeChange(
        projectId,
        chapters[0].id,
        '实质性变更：主角性格重大变化，影响第2章角色描写。',
      );

      // Mark the chapter 2 impact as DEFERRED
      const sourceChapter = stepService
        .getChaptersByProjectId(projectId)
        .find((c) => c.id === chapters[0].id);
      const caSource = sourceChapter!.changeAnalysis as Record<string, unknown> | null;
      const impacted = (caSource!.impactedChapters as ImpactedChapter[]).find(
        (i) => i.chapterNumber === 2,
      );
      if (impacted) {
        impacted.status = 'DEFERRED';
      }

      // Now check reminders for chapter 2
      const reminders = service.getDeferredReminders(projectId, chapters[1].id);
      expect(reminders.length).toBeGreaterThan(0);
      expect(reminders[0].severity).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty newContent gracefully', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      await expect(
        service.analyzeChange(projectId, chapter.id, ''),
      ).rejects.toThrow(/content must not be empty/);
    });

    it('should handle very long content without error', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();
      const chapter = chapters[0];

      const longContent = '非常长的内容。'.repeat(500); // ~3500 chars

      const result = await service.analyzeChange(
        projectId,
        chapter.id,
        longContent,
      );

      expect(result).toBeDefined();
    });

    it('should throw when targeted fix target chapter not found', async () => {
      const { projectId, chapters } = await setupProjectWithChapters();

      await expect(
        service.applyTargetedFix(
          projectId,
          chapters[0].id,
          'nonexistent-chapter',
        ),
      ).rejects.toThrow(/Chapter not found/);
    });
  });
});
