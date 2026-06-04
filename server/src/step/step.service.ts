import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  StepData,
  PhaseType,
  BeatData,
  ChapterData,
  ReviewResult,
  AiMeta,
} from './step.entity';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { ProjectStatus, StatusHistoryEntry } from '../project/project.entity';
import {
  AIGatewayService,
  TaskType,
  AIGenerateChunk,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetService } from './factsheet.service';
import { ReviewService } from './review.service';

const POWER_SYSTEM_REDLINES: { label: string; keywords: string[] }[] = [
  { label: '禁止宣扬暴力至上', keywords: ['暴力至上', '以暴制暴', '暴力崇拜'] },
  { label: '禁止详细描述邪术修炼方法', keywords: ['邪术修炼', '血祭', '生魂'] },
  { label: '禁止贬低现实制度', keywords: ['颠覆政权', '反动', '颠覆国家'] },
];

const VALID_STRUCTURES = ['three-act', 'web-novel-ten', 'four-act-eight'] as const;
type OutlineStructure = (typeof VALID_STRUCTURES)[number];

const R1_STRUCTURAL_FIRST = 3;
const R1_STRUCTURAL_LAST_OFFSET = 2;
const R1_HOOK_THRESHOLD = 3;

@Injectable()
export class StepService {
  private pausedChapterIds: Set<string> = new Set();

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
    private readonly contextBudgetService: ContextBudgetService,
    private readonly factsheetCompensation: FactsheetCompensationService,
    private readonly factsheetService: FactsheetService,
    private readonly reviewService: ReviewService,
  ) {
    // ReviewService now uses Prisma directly; no shared map needed
  }

  getFactsheet(projectId: string): { data: Record<string, unknown>; version: number } | null {
    return this.factsheetService.getFactsheet(projectId);
  }

  async forceSyncFactsheet(
    projectId: string,
  ): Promise<{ mergedEntries: Record<string, unknown>; consumedCount: number }> {
    return this.factsheetService.forceSyncFactsheet(projectId);
  }

  // ─── SETTING Phase ──────────────────────────────────────────

  async generateSetting(
    projectId: string,
    opts: { idea?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'SETTING') throw new BadRequestException('Project status must be SETTING');

    const existing = await this.getSettingByProjectId(projectId);
    const step = existing ?? (await this.createPendingStep(projectId, 'SETTING'));

    const idea = opts.idea ?? '';
    const currentContent = opts.currentContent ?? '';
    const prompt = this.promptLoader.renderTemplate('creation', 'setting-generation', { idea, currentContent });

    step.status = 'AI_GENERATING';
    const { content: output, aiMeta } = await this.collectAiOutput(TaskType.SETTING, prompt);

    const updated = await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        status: 'AWAITING_REVIEW',
        output,
        input: currentContent ? `${idea}\n\n--- 用户编辑内容 ---\n${currentContent}` : idea,
        review: {
          powerSystemCheck: this.runPowerSystemCheck(output),
          annotations: '',
        } as any,
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  async confirmSetting(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'SETTING', 'OUTLINE', 'setting');
  }

  async rejectSetting(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'SETTING', 'setting');
  }

  async getStepByProjectId(projectId: string, phaseType: PhaseType): Promise<StepData | null> {
    const doc = await this.prisma.stepData.findFirst({
      where: { projectId, phaseType },
      orderBy: { version: 'desc' },
    });
    return doc ? this.toStepData(doc) : null;
  }

  async getSettingByProjectId(projectId: string): Promise<StepData | null> {
    return this.getStepByProjectId(projectId, 'SETTING');
  }

  async getOutlineByProjectId(projectId: string): Promise<StepData | null> {
    return this.getStepByProjectId(projectId, 'OUTLINE');
  }

  // ─── IDEA Phase ──────────────────────────────────────────

  async generateIdea(
    projectId: string,
    opts: { idea?: string; feedback?: string },
  ): Promise<StepData> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'IDEA') throw new BadRequestException('Project status must be IDEA');

    const existing = await this.getIdeaByProjectId(projectId);
    const step = existing ?? (await this.createPendingStep(projectId, 'IDEA'));

    const idea = opts.idea ?? '';
    const feedback = opts.feedback ?? '';
    const prompt = this.promptLoader.renderTemplate('creation', 'idea-generation', { idea, feedback });

    step.status = 'AI_GENERATING';
    const { content: output, aiMeta } = await this.collectAiOutput(TaskType.IDEA, prompt);

    // 剥离 AI 可能自发输出的简介段落，确保只保留卖点方案
    const sanitizedOutput = output.replace(/\n#+ (一句话简介|500字简介)[\s\S]*$/i, '');

    const updated = await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        status: 'AWAITING_REVIEW',
        output: sanitizedOutput,
        input: feedback ? `idea: ${idea}\nfeedback: ${feedback}` : idea,
        review: {
          complianceCheck: this.runPowerSystemCheck(sanitizedOutput),
          annotations: '',
        } as any,
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  async generateIdeaSummary(
    projectId: string,
    opts: { selectedSellPoint?: number; customBrief?: string },
  ): Promise<StepData> {
    const existing = await this.getIdeaByProjectId(projectId);
    if (!existing) throw new BadRequestException('No generated idea to generate summary for');
    if (opts.selectedSellPoint === undefined || opts.selectedSellPoint === null) {
      throw new BadRequestException('selectedSellPoint is required');
    }

    // 从 output 中只提取选中卖点的内容，不传全量卖点到 AI
    const sellPointBlocks = (existing.output ?? '').match(
      /## 卖点方案 \d+:[\s\S]*?(?=\n## 卖点方案 \d+:|\n#+ (?:一句话简介|500字简介)|$)/g,
    ) ?? [];
    const selectedContent = sellPointBlocks[opts.selectedSellPoint] ?? (existing.output ?? '');

    const prompt = this.promptLoader.renderTemplate('creation', 'idea-summary-generation', {
      sellPointContent: selectedContent,
      customBrief: opts.customBrief ?? '',
    });

    const { content: summaryOutput } = await this.collectAiOutput(TaskType.IDEA, prompt);

    // 剥离 AI 可能自发输出的卖点段落，确保只保留简介
    const sanitizedSummary = summaryOutput.replace(/\n#+ 卖点方案 \d+:[\s\S]*$/i, '');

    const oneLinerMatch = sanitizedSummary.match(/#+ 一句话简介\n([\s\S]*?)(?=\n#+ |$)/);
    const oneLiner = oneLinerMatch ? oneLinerMatch[1].trim() : '';
    const fullSummaryParts = sanitizedSummary.split(/#+ 500字简介\n/);
    const fullSummary = fullSummaryParts.length >= 2 ? fullSummaryParts[1].trim() : '';

    const updated = await this.prisma.stepData.update({
      where: { id: existing.id },
      data: {
        status: 'AWAITING_REVIEW',
        review: {
          ...(existing.review as Record<string, unknown>),
          selectedSellPoint: opts.selectedSellPoint,
          summaryGenerated: true,
          oneLiner,
          fullSummary,
        } as any,
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  async confirmIdea(
    projectId: string,
    opts: { selectedSellPoint: number; customBrief?: string },
  ): Promise<StepData> {
    const step = await this.confirmPhase(projectId, 'IDEA', 'SETTING', 'idea');
    await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        review: {
          ...(step.review as Record<string, unknown>),
          selectedSellPoint: opts.selectedSellPoint,
          customBrief: opts.customBrief ?? null,
        } as any,
      },
    });
    step.review = {
      ...(step.review as Record<string, unknown>),
      selectedSellPoint: opts.selectedSellPoint,
      customBrief: opts.customBrief ?? null,
    };
    return step;
  }

  async rejectIdea(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'IDEA', 'idea');
  }

  async getIdeaByProjectId(projectId: string): Promise<StepData | null> {
    return this.getStepByProjectId(projectId, 'IDEA');
  }

  // ─── OUTLINE Phase ──────────────────────────────────────────

  async generateOutline(
    projectId: string,
    opts: { setting?: string; structure?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'OUTLINE') throw new BadRequestException('Project status must be OUTLINE');

    const setting = opts.setting ?? '';
    const structure = opts.structure ?? 'three-act';
    if (!VALID_STRUCTURES.includes(structure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }
    const currentContent = opts.currentContent ?? '';

    const existing = await this.getOutlineByProjectId(projectId);
    const step = existing ?? (await this.createPendingStep(projectId, 'OUTLINE'));

    const prompt = this.promptLoader.renderTemplate('creation', 'outline-generation', { setting, structure, currentContent });

    step.status = 'AI_GENERATING';
    const { content: output, aiMeta } = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    const updated = await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        status: 'AWAITING_REVIEW',
        output,
        input: currentContent
          ? `structure: ${structure}\nsetting: ${setting}\n\n--- 用户编辑内容 ---\n${currentContent}`
          : `structure: ${structure}\nsetting: ${setting}`,
        review: {
          structurePacing: this.runPacingReview(output),
          conflictReview: this.runConflictReview(output),
          climaxReview: this.runClimaxReview(output),
          annotations: '',
        } as any,
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  async confirmOutline(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'OUTLINE', 'BEATS', 'outline');
  }

  async rejectOutline(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'OUTLINE', 'outline');
  }

  async switchStructure(projectId: string, newStructure: string): Promise<StepData> {
    const existing = await this.getOutlineByProjectId(projectId);
    if (!existing) throw new BadRequestException('No generated outline to switch');
    if (existing.status === 'CONFIRMED') throw new BadRequestException('Outline already confirmed');
    if (!VALID_STRUCTURES.includes(newStructure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }

    const existingOutput = existing.output ?? '';
    const keyPoints = this.extractKeyPlotPoints(existingOutput);

    const prompt = this.promptLoader.renderTemplate('creation', 'outline-generation', {
      setting: '',
      structure: newStructure,
      currentContent: existingOutput,
      keyPoints: keyPoints || '（无已识别的情节点种子）',
    });

    const { content: output } = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    const review: any = {
      structurePacing: this.runPacingReview(output),
      conflictReview: this.runConflictReview(output),
      climaxReview: this.runClimaxReview(output),
      annotations: '',
    };

    const updated = await this.prisma.stepData.update({
      where: { id: existing.id },
      data: {
        output,
        review,
        input: `structure: ${newStructure}\nkeyPoints preserved: ${keyPoints}`,
        status: 'AWAITING_REVIEW',
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  // ─── BEATS Phase ──────────────────────────────────────────

  async generateBeats(
    projectId: string,
    opts: { outline?: string; currentContent?: string },
  ): Promise<BeatData[]> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'BEATS') throw new BadRequestException('Project status must be BEATS');

    const outline = opts.outline ?? '';
    const currentContent = opts.currentContent ?? '';

    const existingStep = await this.getStepByProjectId(projectId, 'BEATS');
    const step = existingStep ?? (await this.createPendingStep(projectId, 'BEATS'));

    const prompt = this.promptLoader.renderTemplate('creation', 'beats-generation', { outline, currentContent });

    const { content: output, aiMeta } = await this.collectAiOutput(TaskType.BEATS, prompt);

    const existingBeats = await this.getBeatsByProjectId(projectId);
    const newBeats = this.parseBeatsFromOutput(output, projectId);

    // Merge IDs for beats that match by chapter number
    if (existingBeats.length > 0) {
      const idByChapter = new Map(existingBeats.map((b) => [b.chapterNumber, b.id]));
      for (const beat of newBeats) {
        const reusedId = idByChapter.get(beat.chapterNumber);
        if (reusedId) beat.id = reusedId;
      }
    }

    // Replace all beats for this project in DB
    await this.prisma.beat.deleteMany({ where: { projectId } });
    for (const beat of newBeats) {
      const createData: Record<string, unknown> = {
        projectId: beat.projectId,
        chapterNumber: beat.chapterNumber,
        plan: beat.plan,
        targetWordCount: beat.targetWordCount,
        hookCount: beat.hookCount,
        isClimax: beat.isClimax,
        useR1: beat.useR1,
        status: beat.status,
      };
      // Only set id when reusing an existing valid DB ObjectId (from merge logic)
      if (beat.id) {
        createData.id = beat.id;
      }
      const created = await this.prisma.beat.create({ data: createData as any });
      // Update beat id with DB-generated value for return consistency
      beat.id = (created as Record<string, unknown>).id as string;
    }

    await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        status: 'AWAITING_REVIEW',
        output,
        input: currentContent
          ? `outline: ${outline}\n\n--- 用户编辑内容 ---\n${currentContent}`
          : `outline: ${outline}`,
        review: { beatCount: newBeats.length, annotations: '' } as any,
        version: { increment: 1 },
      },
    });

    return newBeats;
  }

  async confirmBeats(projectId: string): Promise<StepData> {
    const step = await this.confirmPhase(projectId, 'BEATS', 'DRAFTING', 'beats');

    const beats = await this.getBeatsByProjectId(projectId);
    const totalChapters = beats.length;

    for (const beat of beats) {
      const useR1 = this.shouldUseR1(beat, totalChapters);
      await this.prisma.beat.update({
        where: { id: beat.id },
        data: { useR1, status: 'CONFIRMED' },
      });
      beat.useR1 = useR1;
      beat.status = 'CONFIRMED';
    }

    // Create chapters from confirmed beats
    const existingChapters = await this.getChaptersByProjectId(projectId);
    if (existingChapters.length === 0) {
      for (const beat of beats) {
        await this.prisma.chapter.create({
          data: {
            projectId: beat.projectId,
            chapterNumber: beat.chapterNumber,
            title: null,
            beatPlan: beat.plan as any,
            targetWordCount: beat.targetWordCount,
            content: null,
            status: 'PENDING',
            chapterFingerprint: null,
            contextSummary: null,
            reviewResult: null,
            changeAnalysis: null,
          },
        });
      }
    }

    return step;
  }

  async rejectBeats(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'BEATS', 'beats');
  }

  async getBeatsByProjectId(projectId: string): Promise<BeatData[]> {
    const docs = await this.prisma.beat.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    });
    return docs.map((d) => this.toBeat(d));
  }

  async updateBeatWordCount(beatId: string, wordCount: number): Promise<BeatData> {
    const beat = await this.findBeatById(beatId);
    if (!beat) throw new NotFoundException('Beat not found');

    const updated = await this.prisma.beat.update({
      where: { id: beatId },
      data: { targetWordCount: wordCount, status: 'STALE' },
    });

    // Also update the chapter if it exists
    const chapters = await this.getChaptersByProjectId(beat.projectId);
    const chapter = chapters.find((c) => c.chapterNumber === beat.chapterNumber);
    if (chapter) {
      await this.prisma.chapter.update({
        where: { id: chapter.id },
        data: { targetWordCount: wordCount },
      });
    }

    return this.toBeat(updated);
  }

  async updateBeatStructure(beatId: string, plan: Record<string, unknown>): Promise<BeatData> {
    const beat = await this.findBeatById(beatId);
    if (!beat) throw new NotFoundException('Beat not found');

    const mergedPlan = { ...beat.plan, ...plan };
    const isClimax = plan.isClimax === true;
    const hookCount = this.extractHookCount(mergedPlan);
    const beats = await this.getBeatsByProjectId(beat.projectId);
    const useR1 = this.shouldUseR1({ ...beat, plan: mergedPlan, hookCount, isClimax }, beats.length);

    const updated = await this.prisma.beat.update({
      where: { id: beatId },
      data: {
        plan: mergedPlan as any,
        isClimax: isClimax || beat.isClimax,
        hookCount,
        useR1,
        status: 'STALE',
      },
    });

    const chapter = (await this.getChaptersByProjectId(beat.projectId))
      .find((c) => c.chapterNumber === beat.chapterNumber);
    if (chapter) {
      await this.prisma.chapter.update({
        where: { id: chapter.id },
        data: { beatPlan: mergedPlan as any },
      });
    }

    return this.toBeat(updated);
  }

  async getChaptersByProjectId(projectId: string): Promise<ChapterData[]> {
    const docs = await this.prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    });
    return docs.map((d) => this.toChapter(d));
  }

  // ─── DRAFTING Phase: Chapter Generation ──────────────────────

  async generateChapter(
    projectId: string,
    chapterId: string,
    opts: { mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade'; feedback?: string },
  ): Promise<ChapterData> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'DRAFTING') throw new BadRequestException('Project status must be DRAFTING');

    const chapter = await this.getChapterOrThrow(chapterId);

    const previous = await this.findPreviousChapter(projectId, chapter.chapterNumber);
    if (previous && !['COMPLETED', 'DISPUTED'].includes(previous.status)) {
      throw new BadRequestException(
        `Previous chapter ${previous.chapterNumber} must be COMPLETED or DISPUTED before generating chapter ${chapter.chapterNumber}`,
      );
    }

    // Issue #21: compute three-layer context budget before constructing prompt
    const budget = await this.contextBudgetService.computeBudget(projectId, chapterId);

    const chResult = await this.collectAiOutput(
      await this.resolveChapterTaskType(chapter),
      this.promptLoader.renderTemplate('creation', 'chapter-generation', {
        mode: opts.mode,
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        targetWordCount: String(chapter.targetWordCount),
        feedback: opts.feedback ?? '',
        previousSummary: previous?.contextSummary ?? '',
        globalStatic: budget.globalStatic,
        globalDynamic: budget.globalDynamic,
        localContext: budget.local,
      }),
    );

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { content: chResult.content, status: 'DRAFT' },
    });
    chapter.content = chResult.content;
    chapter.status = 'DRAFT';

    await this.runPostGenerationPipeline(chapter, projectId);

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: 'REVIEWING' },
    });
    chapter.status = 'REVIEWING';
    this.pausedChapterIds.delete(chapterId);

    return chapter;
  }

  async confirmChapter(projectId: string, chapterId: string): Promise<ChapterData> {
    return this.transitionChapterStatus(chapterId, 'REVIEWING', 'COMPLETED');
  }

  async disputeChapter(projectId: string, chapterId: string): Promise<ChapterData> {
    return this.transitionChapterStatus(chapterId, 'REVIEWING', 'DISPUTED');
  }

  async pauseChapterGeneration(projectId: string, chapterId: string): Promise<ChapterData> {
    const chapter = await this.getChapterOrThrow(chapterId);
    if (chapter.status === 'PENDING' && !chapter.content) {
      throw new BadRequestException('No active generation to pause');
    }
    this.pausedChapterIds.add(chapterId);
    return chapter;
  }

  async continueChapterGeneration(
    projectId: string,
    chapterId: string,
    opts: { currentContent: string },
  ): Promise<ChapterData> {
    const chapter = await this.getChapterOrThrow(chapterId);
    if (!this.pausedChapterIds.has(chapterId)) {
      throw new BadRequestException('No paused generation to continue');
    }

    // Issue #21: compute three-layer context budget before constructing prompt
    const budget = await this.contextBudgetService.computeBudget(projectId, chapterId);

    const continuation = await this.collectAiOutput(
      await this.resolveChapterTaskType(chapter),
      this.promptLoader.renderTemplate('creation', 'chapter-generation', {
        mode: 'new-continue',
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        targetWordCount: String(chapter.targetWordCount),
        currentContent: opts.currentContent,
        globalStatic: budget.globalStatic,
        globalDynamic: budget.globalDynamic,
        localContext: budget.local,
      }),
    );

    const newContent = opts.currentContent + continuation.content;
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { content: newContent, status: 'DRAFT' },
    });
    chapter.content = newContent;
    chapter.status = 'DRAFT';

    await this.runPostGenerationPipeline(chapter, projectId);

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: 'REVIEWING' },
    });
    chapter.status = 'REVIEWING';
    this.pausedChapterIds.delete(chapterId);

    return chapter;
  }

  async retryChapterGeneration(
    projectId: string,
    chapterId: string,
    opts: { mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade'; feedback?: string },
  ): Promise<ChapterData> {
    return this.generateChapter(projectId, chapterId, { mode: opts.mode, feedback: opts.feedback });
  }

  // ─── Review (delegated to ReviewService) ────────────────────────

  async evaluateChapter(chapterId: string): Promise<ReviewResult> {
    return this.reviewService.evaluateChapter(chapterId);
  }

  async appealReview(chapterId: string, reason: string): Promise<ReviewResult> {
    return this.reviewService.appealReview(chapterId, reason);
  }

  getActionsForChapter(chapterId: string) {
    return this.reviewService.getActionsForChapter(chapterId);
  }

  getAvailableActions(verdict: string) {
    return this.reviewService.getAvailableActions(verdict);
  }

  async forceDisputeChapter(chapterId: string): Promise<any> {
    return this.reviewService.forceDisputeChapter(chapterId);
  }

  // ─── Private helpers for DRAFTING phase ──────────────────────

  private async getChapterOrThrow(chapterId: string): Promise<ChapterData> {
    const chapter = await this.findChapterById(chapterId);
    if (!chapter) throw new NotFoundException('Chapter not found');
    return chapter;
  }

  private async runPostGenerationPipeline(chapter: ChapterData, projectId: string): Promise<void> {
    // Step 2: Fingerprint extraction
    const fpResult = await this.collectAiOutput(TaskType.FINGERPRINT_EXTRACTION, `Extract fingerprint for: ${chapter.content}`);
    await this.prisma.chapter.update({
      where: { id: chapter.id },
      data: { chapterFingerprint: fpResult.content },
    });
    chapter.chapterFingerprint = fpResult.content;

    // Step 3: FactSheet update
    const sheetUpdateResult = await this.collectAiOutput(TaskType.FACTSHEET_UPDATE, `Update FactSheet with: ${chapter.content}`);
    let updateEntries: Record<string, unknown>;
    try {
      updateEntries = JSON.parse(sheetUpdateResult.content);
    } catch {
      updateEntries = { ['chapter_' + chapter.chapterNumber]: { annotation: sheetUpdateResult.content } };
    }

    let written = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = this.factsheetService.readFactsheet(projectId);
      const merged = { ...current.data };
      Object.assign(merged, updateEntries);

      if (await this.factsheetService.casWriteFactsheet(projectId, merged, current.version)) {
        written = true;
        break;
      }
    }

    if (written) {
      await this.factsheetService.applyCompensationQueue(projectId);
    } else {
      await this.factsheetCompensation.enqueue(projectId, chapter.id, chapter.chapterNumber, updateEntries);
    }

    // Step 4: Independent review
    const reviewResult = await this.collectAiOutput(TaskType.INDEPENDENT_REVIEW, `Review content: ${chapter.content}`);
    const reviewData: Record<string, unknown> = {
      passed: true,
      raw: reviewResult.content,
      reviewedAt: new Date().toISOString(),
    };
    await this.prisma.chapter.update({
      where: { id: chapter.id },
      data: { reviewResult: reviewData as any },
    });
    chapter.reviewResult = reviewData;

    // Step 5: Context summary
    const estimatedTokens = this.estimateTokens(chapter.content!);
    if (estimatedTokens > 2500) {
      const summaryResult = await this.collectAiOutput(TaskType.CHAPTER_GENERATION, `Summarize: ${chapter.content!.substring(0, 8000)}`);
      await this.prisma.chapter.update({
        where: { id: chapter.id },
        data: { contextSummary: summaryResult.content },
      });
      chapter.contextSummary = summaryResult.content;
    }
  }

  private async transitionChapterStatus(
    chapterId: string,
    expectedStatus: ChapterData['status'],
    targetStatus: ChapterData['status'],
  ): Promise<ChapterData> {
    const chapter = await this.getChapterOrThrow(chapterId);
    if (chapter.status !== expectedStatus) {
      throw new BadRequestException(`Chapter must be ${expectedStatus} (current: ${chapter.status})`);
    }
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: targetStatus },
    });
    chapter.status = targetStatus;
    return chapter;
  }

  private async findChapterById(chapterId: string): Promise<ChapterData | null> {
    const doc = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    return doc ? this.toChapter(doc) : null;
  }

  private async findPreviousChapter(projectId: string, chapterNumber: number): Promise<ChapterData | null> {
    if (chapterNumber <= 1) return null;
    const doc = await this.prisma.chapter.findFirst({
      where: { projectId, chapterNumber: chapterNumber - 1 },
    });
    return doc ? this.toChapter(doc) : null;
  }

  private estimateTokens(content: string): number {
    const chineseChars = (content.match(/[一-鿿]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + Math.ceil(englishWords * 1.3);
  }

  private async findBeatById(beatId: string): Promise<BeatData | null> {
    const doc = await this.prisma.beat.findUnique({ where: { id: beatId } });
    return doc ? this.toBeat(doc) : null;
  }

  private async resolveChapterTaskType(chapter: ChapterData): Promise<TaskType> {
    const beats = await this.getBeatsByProjectId(chapter.projectId);
    const beat = beats.find((b) => b.chapterNumber === chapter.chapterNumber);
    return beat?.useR1 ? TaskType.CRITICAL_CHAPTER : TaskType.CHAPTER_GENERATION;
  }

  private shouldUseR1(beat: BeatData, totalChapters: number): boolean {
    return (
      beat.chapterNumber <= R1_STRUCTURAL_FIRST ||
      beat.chapterNumber >= totalChapters - R1_STRUCTURAL_LAST_OFFSET ||
      beat.hookCount >= R1_HOOK_THRESHOLD ||
      beat.isClimax
    );
  }

  private parseBeatsFromOutput(output: string, projectId: string): BeatData[] {
    const beats: BeatData[] = [];
    const sections = output.split(/## Chapter \d+:/g).slice(1);
    const headerMatches = output.match(/## Chapter (\d+):/g);

    if (!headerMatches) return beats;

    for (let i = 0; i < headerMatches.length; i++) {
      const numMatch = headerMatches[i].match(/Chapter (\d+):/);
      if (!numMatch) continue;
      const chapterNumber = parseInt(numMatch[1], 10);
      const body = sections[i] ?? '';

      const conflictMatch = body.match(/冲突点:\s*(.+)/);
      const hooksMatch = body.match(/钩子预设:\s*(.+)/);
      const expectationMatch = body.match(/读者期待值:\s*(.+)/);
      const wordCountMatch = body.match(/目标字数:\s*(\d+)/);

      const hookPresets = hooksMatch
        ? hooksMatch[1].split(/[,，、]/).map((h) => h.trim()).filter(Boolean)
        : [];
      const hookCount = hookPresets.length;

      const plan: Record<string, unknown> = {
        conflictPoint: conflictMatch ? conflictMatch[1].trim() : '',
        hookPresets,
        readerExpectation: expectationMatch ? expectationMatch[1].trim() : '中',
      };

      beats.push({
        id: '',
        projectId,
        chapterNumber,
        plan,
        targetWordCount: wordCountMatch ? parseInt(wordCountMatch[1], 10) : 3000,
        hookCount,
        isClimax: false,
        useR1: false,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return beats;
  }

  private extractHookCount(plan: Record<string, unknown>): number {
    const hooks = plan.hookPresets;
    if (Array.isArray(hooks)) return hooks.length;
    return 0;
  }

  private async confirmPhase(
    projectId: string,
    phaseType: PhaseType,
    nextStatus: ProjectStatus,
    label: string,
  ): Promise<StepData> {
    const existing = await this.getStepByProjectId(projectId, phaseType);
    if (!existing) throw new BadRequestException(`No generated ${label} to confirm`);
    if (existing.status === 'CONFIRMED') throw new BadRequestException(`${label} already confirmed`);
    if (existing.status !== 'AWAITING_REVIEW') {
      throw new BadRequestException(`${label} must be AWAITING_REVIEW to confirm (current: ${existing.status})`);
    }

    await this.prisma.stepData.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await this.projectService.update(projectId, { status: nextStatus });

    existing.status = 'CONFIRMED';
    existing.confirmedAt = new Date();
    return existing;
  }

  private async rejectPhase(
    projectId: string,
    phaseType: PhaseType,
    label: string,
  ): Promise<StepData> {
    const existing = await this.getStepByProjectId(projectId, phaseType);
    if (!existing) throw new BadRequestException(`No generated ${label} to reject`);
    if (existing.status === 'CONFIRMED') throw new BadRequestException(`${label} already confirmed`);
    if (existing.status === 'REJECTED') throw new BadRequestException(`${label} already rejected`);

    await this.prisma.stepData.update({
      where: { id: existing.id },
      data: { status: 'REJECTED' },
    });
    existing.status = 'REJECTED';
    return existing;
  }

  private async createPendingStep(projectId: string, phaseType: PhaseType): Promise<StepData> {
    const doc = await this.prisma.stepData.create({
      data: {
        projectId,
        phaseType,
        status: 'PENDING',
        input: null,
        output: null,
        review: null,
        version: 1,
        confirmedAt: null,
      },
    });
    return this.toStepData(doc);
  }

  private async collectAiOutput(
    taskType: TaskType,
    prompt: string,
  ): Promise<{ content: string; aiMeta: AiMeta }> {
    try {
      const chunks$: Observable<AIGenerateChunk> = this.aiGateway.callWithFallback(taskType, prompt);
      const chunks = await lastValueFrom(chunks$.pipe(toArray()));
      const lastChunk = chunks[chunks.length - 1];
      const content = chunks
        .filter((c) => !c.done && c.content)
        .map((c) => c.content)
        .join('');
      const aiMeta: AiMeta = {
        modelUsed: lastChunk?.modelUsed ?? this.aiGateway.getModelForTask(taskType),
        degraded: lastChunk?.degraded ?? false,
        failed: lastChunk?.failed ?? false,
      };
      return { content, aiMeta };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`AI 生成失败: ${msg}`);
    }
  }

  private extractKeyPlotPoints(output: string): string {
    const lines = output.split('\n').filter((l) => l.match(/情节点\d+/));
    return lines.join('\n');
  }

  private runPacingReview(output: string): Record<string, unknown> {
    const hasMultiAct = /第[一二三四五六七八九十]幕|第[一二三四五六七八九十]章/.test(output);
    return { passed: hasMultiAct, score: hasMultiAct ? 85 : 50, notes: hasMultiAct ? '节奏分布合理' : '缺少多幕/章结构' };
  }

  private runConflictReview(output: string): Record<string, unknown> {
    const hasConflict = /冲突|矛盾|对抗|危机|敌人|反派/.test(output);
    return { passed: hasConflict, notes: hasConflict ? '冲突要素存在' : '缺少冲突要素' };
  }

  private runClimaxReview(output: string): Record<string, unknown> {
    const hasClimax = /高潮|决战|终极|巅峰/.test(output);
    return { passed: hasClimax, notes: hasClimax ? '高潮点存在' : '缺少高潮点' };
  }

  // ─── Project Completion ──────────────────────────

  async confirmCompletion(
    projectId: string,
    action?: 'sync-and-complete' | 'skip-and-complete',
  ): Promise<{
    status?: ProjectStatus;
    needsQueueResolution: boolean;
    options?: { action: string; label: string }[];
  }> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const chapters = await this.getChaptersByProjectId(projectId);
    if (chapters.length === 0) throw new BadRequestException('No chapters found');

    const allCompletedOrDisputed = chapters.every((ch) => ch.status === 'COMPLETED' || ch.status === 'DISPUTED');
    if (!allCompletedOrDisputed) {
      throw new BadRequestException('All chapters must be COMPLETED or DISPUTED before project completion');
    }

    const queueDepth = await this.factsheetCompensation.getQueueDepth(projectId);

    if (action) {
      if (action === 'sync-and-complete' && queueDepth > 0) {
        const factSheet = this.getFactsheet(projectId) ?? { data: {}, version: 0 };
        this.factsheetCompensation.forceSync(projectId, factSheet.data);
      }
      this.appendMilestone(project, 'COMPLETED', `User confirmed completion (${action})`);
      await this.projectService.update(projectId, { status: 'COMPLETED' });
      return { needsQueueResolution: false, status: 'COMPLETED' };
    }

    if (queueDepth > 0) {
      return {
        needsQueueResolution: true,
        options: [
          { action: 'sync-and-complete', label: '立即同步并完本' },
          { action: 'skip-and-complete', label: '跳过并完本（队列保留）' },
          { action: 'cancel', label: '取消' },
        ],
      };
    }

    this.appendMilestone(project, 'COMPLETED', 'User confirmed project completion');
    await this.projectService.update(projectId, { status: 'COMPLETED' });
    return { needsQueueResolution: false, status: 'COMPLETED' };
  }

  async reopenProject(projectId: string): Promise<{ status: ProjectStatus }> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'COMPLETED') throw new BadRequestException('Only COMPLETED projects can be reopened');

    this.appendMilestone(project, 'DRAFTING', 'User chose to reopen project for continued creation');
    await this.projectService.update(projectId, { status: 'DRAFTING' });
    return { status: 'DRAFTING' };
  }

  private appendMilestone(
    project: { id: string; statusHistory?: StatusHistoryEntry[] },
    status: ProjectStatus,
    reason: string,
  ): void {
    const history = [...(project.statusHistory ?? [])];
    history.push({ status, changedAt: new Date().toISOString(), reason });
  }

  private runPowerSystemCheck(output: string): Record<string, unknown> {
    const flags: string[] = [];
    for (const redline of POWER_SYSTEM_REDLINES) {
      const matched = redline.keywords.some((kw) => output.includes(kw));
      if (matched) flags.push(redline.label);
    }
    return { passed: flags.length === 0, flags, checkedAt: new Date().toISOString() };
  }

  // ─── Type mappers ──────────────────────────────────────────

  private toStepData(doc: Record<string, unknown>): StepData {
    return {
      id: doc['id'] as string,
      projectId: doc['projectId'] as string,
      phaseType: doc['phaseType'] as PhaseType,
      status: doc['status'] as StepData['status'],
      input: (doc['input'] as string) ?? null,
      output: (doc['output'] as string) ?? null,
      review: (doc['review'] as Record<string, unknown>) ?? null,
      version: (doc['version'] as number) ?? 1,
      confirmedAt: doc['confirmedAt'] ? new Date(doc['confirmedAt'] as string) : null,
      aiMeta: (doc['aiMeta'] as AiMeta) ?? undefined,
    };
  }

  private toBeat(doc: Record<string, unknown>): BeatData {
    return {
      id: doc['id'] as string,
      projectId: doc['projectId'] as string,
      chapterNumber: doc['chapterNumber'] as number,
      plan: (doc['plan'] as Record<string, unknown>) ?? {},
      targetWordCount: (doc['targetWordCount'] as number) ?? 3000,
      hookCount: (doc['hookCount'] as number) ?? 0,
      isClimax: (doc['isClimax'] as boolean) ?? false,
      useR1: (doc['useR1'] as boolean) ?? false,
      status: (doc['status'] as BeatData['status']) ?? 'PENDING',
      createdAt: new Date(doc['createdAt'] as string),
      updatedAt: new Date(doc['updatedAt'] as string),
    };
  }

  private toChapter(doc: Record<string, unknown>): ChapterData {
    return {
      id: doc['id'] as string,
      projectId: doc['projectId'] as string,
      chapterNumber: doc['chapterNumber'] as number,
      title: (doc['title'] as string) ?? null,
      beatPlan: (doc['beatPlan'] as Record<string, unknown>) ?? null,
      targetWordCount: (doc['targetWordCount'] as number) ?? 3000,
      content: (doc['content'] as string) ?? null,
      status: (doc['status'] as ChapterData['status']) ?? 'PENDING',
      chapterFingerprint: (doc['chapterFingerprint'] as string) ?? null,
      contextSummary: (doc['contextSummary'] as string) ?? null,
      reviewResult: (doc['reviewResult'] as Record<string, unknown>) ?? null,
      changeAnalysis: (doc['changeAnalysis'] as Record<string, unknown>) ?? null,
      targetedFixHistory: (doc['targetedFixHistory'] as ChapterData['targetedFixHistory']) ?? [],
      createdAt: new Date(doc['createdAt'] as string),
      updatedAt: new Date(doc['updatedAt'] as string),
    };
  }
}
