import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { StepData, PhaseType, BeatData, ChapterData } from './step.entity';
import { ProjectService } from '../project/project.service';
import { ProjectStatus } from '../project/project.entity';
import {
  AIGatewayService,
  TaskType,
  AIGenerateChunk,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';

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
  private steps: Map<string, StepData> = new Map();
  private beatsByProject: Map<string, BeatData[]> = new Map();
  private chaptersByProject: Map<string, ChapterData[]> = new Map();
  private pausedChapterIds: Set<string> = new Set();
  private factSheetByProject: Map<string, Record<string, unknown>> = new Map();

  constructor(
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
  ) {}

  async generateSetting(
    projectId: string,
    opts: { idea?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'SETTING') {
      throw new BadRequestException('Project status must be SETTING');
    }

    const existing = this.getSettingByProjectId(projectId);
    const step = existing ?? this.createPendingStep(projectId, 'SETTING');

    const idea = opts.idea ?? '';
    const currentContent = opts.currentContent ?? '';
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'setting-generation',
      { idea, currentContent },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.SETTING, prompt);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = currentContent
      ? `${idea}\n\n--- 用户编辑内容 ---\n${currentContent}`
      : idea;
    step.review = {
      powerSystemCheck: this.runPowerSystemCheck(output),
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    this.steps.set(step.id, step);
    return step;
  }

  async confirmSetting(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'SETTING', 'OUTLINE', 'setting');
  }

  async rejectSetting(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'SETTING', 'setting');
  }

  getStepByProjectId(projectId: string, phaseType: PhaseType): StepData | null {
    for (const step of this.steps.values()) {
      if (step.projectId === projectId && step.phaseType === phaseType) {
        return step;
      }
    }
    return null;
  }

  getSettingByProjectId(projectId: string): StepData | null {
    return this.getStepByProjectId(projectId, 'SETTING');
  }

  getOutlineByProjectId(projectId: string): StepData | null {
    return this.getStepByProjectId(projectId, 'OUTLINE');
  }

  // ─── IDEA Phase ──────────────────────────────────────────

  async generateIdea(
    projectId: string,
    opts: { idea?: string; feedback?: string },
  ): Promise<StepData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'IDEA') {
      throw new BadRequestException('Project status must be IDEA');
    }

    const existing = this.getIdeaByProjectId(projectId);
    const step = existing ?? this.createPendingStep(projectId, 'IDEA');

    const idea = opts.idea ?? '';
    const feedback = opts.feedback ?? '';
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'idea-generation',
      { idea, feedback },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.IDEA, prompt);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = feedback
      ? `idea: ${idea}\nfeedback: ${feedback}`
      : idea;
    step.review = {
      complianceCheck: this.runPowerSystemCheck(output),
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    this.steps.set(step.id, step);
    return step;
  }

  async generateIdeaSummary(
    projectId: string,
    opts: { selectedSellPoint?: number; customBrief?: string },
  ): Promise<StepData> {
    const existing = this.getIdeaByProjectId(projectId);
    if (!existing) {
      throw new BadRequestException('No generated idea to generate summary for');
    }
    if (opts.selectedSellPoint === undefined || opts.selectedSellPoint === null) {
      throw new BadRequestException('selectedSellPoint is required');
    }

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'idea-summary-generation',
      {
        sellPointContent: existing.output ?? '',
        selectedSellPoint: String(opts.selectedSellPoint),
        customBrief: opts.customBrief ?? '',
      },
    );

    existing.status = 'AI_GENERATING';
    const summaryOutput = await this.collectAiOutput(TaskType.IDEA, prompt);

    existing.status = 'AWAITING_REVIEW';
    existing.output = (existing.output ?? '') + '\n\n' + summaryOutput;
    existing.review = {
      ...(existing.review as Record<string, unknown>),
      selectedSellPoint: opts.selectedSellPoint,
      summaryGenerated: true,
    };
    existing.version += 1;

    this.steps.set(existing.id, existing);
    return existing;
  }

  async confirmIdea(
    projectId: string,
    opts: { selectedSellPoint: number; customBrief?: string },
  ): Promise<StepData> {
    const step = await this.confirmPhase(projectId, 'IDEA', 'SETTING', 'idea');
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

  getIdeaByProjectId(projectId: string): StepData | null {
    return this.getStepByProjectId(projectId, 'IDEA');
  }

  // ─── OUTLINE Phase ──────────────────────────────────────────

  async generateOutline(
    projectId: string,
    opts: { setting?: string; structure?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'OUTLINE') {
      throw new BadRequestException('Project status must be OUTLINE');
    }

    const setting = opts.setting ?? '';
    const structure = opts.structure ?? 'three-act';
    if (!VALID_STRUCTURES.includes(structure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }
    const currentContent = opts.currentContent ?? '';

    const existing = this.getOutlineByProjectId(projectId);
    const step = existing ?? this.createPendingStep(projectId, 'OUTLINE');

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'outline-generation',
      { setting, structure, currentContent },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = currentContent
      ? `structure: ${structure}\nsetting: ${setting}\n\n--- 用户编辑内容 ---\n${currentContent}`
      : `structure: ${structure}\nsetting: ${setting}`;
    step.review = {
      structurePacing: this.runPacingReview(output),
      conflictReview: this.runConflictReview(output),
      climaxReview: this.runClimaxReview(output),
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    this.steps.set(step.id, step);
    return step;
  }

  async confirmOutline(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'OUTLINE', 'BEATS', 'outline');
  }

  async rejectOutline(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'OUTLINE', 'outline');
  }

  async switchStructure(
    projectId: string,
    newStructure: string,
  ): Promise<StepData> {
    const existing = this.getOutlineByProjectId(projectId);
    if (!existing) {
      throw new BadRequestException('No generated outline to switch');
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException('Outline already confirmed');
    }
    if (!VALID_STRUCTURES.includes(newStructure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }

    const existingOutput = existing.output ?? '';
    const keyPoints = this.extractKeyPlotPoints(existingOutput);
    existing.status = 'AI_GENERATING';

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'outline-generation',
      {
        setting: '',
        structure: newStructure,
        currentContent: existingOutput,
        keyPoints: keyPoints || '（无已识别的情节点种子）',
      },
    );

    const output = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    const review = {
      structurePacing: this.runPacingReview(output),
      conflictReview: this.runConflictReview(output),
      climaxReview: this.runClimaxReview(output),
      annotations: 'AI 生成内容，仅供参考',
    };

    existing.output = output;
    existing.review = review;
    existing.version += 1;
    existing.status = 'AWAITING_REVIEW';
    existing.input = `structure: ${newStructure}\nkeyPoints preserved: ${keyPoints}`;

    return existing;
  }

  // ─── BEATS Phase ──────────────────────────────────────────

  async generateBeats(
    projectId: string,
    opts: { outline?: string; currentContent?: string },
  ): Promise<BeatData[]> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'BEATS') {
      throw new BadRequestException('Project status must be BEATS');
    }

    const outline = opts.outline ?? '';
    const currentContent = opts.currentContent ?? '';

    const existingStep = this.getStepByProjectId(projectId, 'BEATS');
    const step = existingStep ?? this.createPendingStep(projectId, 'BEATS');

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'beats-generation',
      { outline, currentContent },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.BEATS, prompt);

    const existingBeats = this.beatsByProject.get(projectId) ?? [];
    const newBeats = this.parseBeatsFromOutput(output, projectId);

    if (existingBeats.length > 0) {
      const idByChapter = new Map(
        existingBeats.map((b) => [b.chapterNumber, b.id]),
      );
      for (const beat of newBeats) {
        const reusedId = idByChapter.get(beat.chapterNumber);
        if (reusedId) beat.id = reusedId;
      }
    }

    this.beatsByProject.set(projectId, newBeats);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = currentContent
      ? `outline: ${outline}\n\n--- 用户编辑内容 ---\n${currentContent}`
      : `outline: ${outline}`;
    step.review = {
      beatCount: newBeats.length,
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    return newBeats;
  }

  async confirmBeats(projectId: string): Promise<StepData> {
    const step = await this.confirmPhase(projectId, 'BEATS', 'DRAFTING', 'beats');

    const beats = this.beatsByProject.get(projectId) ?? [];
    const totalChapters = beats.length;

    for (const beat of beats) {
      beat.useR1 = this.shouldUseR1(beat, totalChapters);
      beat.status = 'CONFIRMED';
    }

    this.chaptersByProject.set(
      projectId,
      beats.map((b) => this.createChapterFromBeat(b)),
    );

    return step;
  }

  async rejectBeats(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'BEATS', 'beats');
  }

  getBeatsByProjectId(projectId: string): BeatData[] {
    return this.beatsByProject.get(projectId) ?? [];
  }

  async updateBeatWordCount(
    beatId: string,
    wordCount: number,
  ): Promise<BeatData> {
    const beat = this.findBeatById(beatId);
    if (!beat) throw new NotFoundException('Beat not found');

    beat.targetWordCount = wordCount;
    beat.status = 'STALE';
    beat.updatedAt = new Date();

    const chapter = this.findChapterForBeat(beat);
    if (chapter) {
      chapter.targetWordCount = wordCount;
      chapter.updatedAt = new Date();
    }

    return beat;
  }

  async updateBeatStructure(
    beatId: string,
    plan: Record<string, unknown>,
  ): Promise<BeatData> {
    const beat = this.findBeatById(beatId);
    if (!beat) throw new NotFoundException('Beat not found');

    beat.plan = { ...beat.plan, ...plan };
    if (plan.isClimax === true) beat.isClimax = true;
    beat.hookCount = this.extractHookCount(beat.plan);
    beat.status = 'STALE';
    beat.updatedAt = new Date();

    const chapter = this.findChapterForBeat(beat);
    if (chapter) {
      chapter.beatPlan = beat.plan;
      chapter.updatedAt = new Date();
    }

    return beat;
  }

  getChaptersByProjectId(projectId: string): ChapterData[] {
    return this.chaptersByProject.get(projectId) ?? [];
  }

  // ─── DRAFTING Phase: Chapter Generation ──────────────────────

  async generateChapter(
    projectId: string,
    chapterId: string,
    opts: {
      mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade';
      feedback?: string;
    },
  ): Promise<ChapterData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'DRAFTING') {
      throw new BadRequestException('Project status must be DRAFTING');
    }

    const chapter = this.getChapterOrThrow(chapterId);

    // Sequential lock: previous chapter must be COMPLETED or DISPUTED
    const previous = this.findPreviousChapter(projectId, chapter.chapterNumber);
    if (previous && !['COMPLETED', 'DISPUTED'].includes(previous.status)) {
      throw new BadRequestException(
        `Previous chapter ${previous.chapterNumber} must be COMPLETED or DISPUTED before generating chapter ${chapter.chapterNumber}`,
      );
    }

    // Step 1: SSE streaming content generation
    chapter.status = 'DRAFT';
    chapter.content = await this.collectAiOutput(
      TaskType.CHAPTER_GENERATION,
      this.promptLoader.renderTemplate('creation', 'chapter-generation', {
        mode: opts.mode,
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        targetWordCount: String(chapter.targetWordCount),
        feedback: opts.feedback ?? '',
        previousSummary: previous?.contextSummary ?? '',
      }),
    );

    // Steps 2–5: post-generation pipeline
    await this.runPostGenerationPipeline(chapter, projectId);

    chapter.status = 'REVIEWING';
    chapter.updatedAt = new Date();
    this.pausedChapterIds.delete(chapterId);

    return chapter;
  }

  async confirmChapter(
    projectId: string,
    chapterId: string,
  ): Promise<ChapterData> {
    return this.transitionChapterStatus(chapterId, 'REVIEWING', 'COMPLETED');
  }

  async disputeChapter(
    projectId: string,
    chapterId: string,
  ): Promise<ChapterData> {
    return this.transitionChapterStatus(chapterId, 'REVIEWING', 'DISPUTED');
  }

  async pauseChapterGeneration(
    projectId: string,
    chapterId: string,
  ): Promise<ChapterData> {
    const chapter = this.getChapterOrThrow(chapterId);
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
    const chapter = this.getChapterOrThrow(chapterId);
    if (!this.pausedChapterIds.has(chapterId)) {
      throw new BadRequestException('No paused generation to continue');
    }

    chapter.status = 'DRAFT';
    chapter.content = opts.currentContent;

    const continuation = await this.collectAiOutput(
      TaskType.CHAPTER_GENERATION,
      this.promptLoader.renderTemplate('creation', 'chapter-generation', {
        mode: 'new-continue',
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        targetWordCount: String(chapter.targetWordCount),
        currentContent: opts.currentContent,
      }),
    );

    chapter.content = opts.currentContent + continuation;

    await this.runPostGenerationPipeline(chapter, projectId);

    chapter.status = 'REVIEWING';
    chapter.updatedAt = new Date();
    this.pausedChapterIds.delete(chapterId);

    return chapter;
  }

  async retryChapterGeneration(
    projectId: string,
    chapterId: string,
    opts: {
      mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade';
      feedback?: string;
    },
  ): Promise<ChapterData> {
    return this.generateChapter(projectId, chapterId, {
      mode: opts.mode,
      feedback: opts.feedback,
    });
  }

  // ─── Private helpers for DRAFTING phase ──────────────────────

  private getChapterOrThrow(chapterId: string): ChapterData {
    const chapter = this.findChapterById(chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
    return chapter;
  }

  private async runPostGenerationPipeline(
    chapter: ChapterData,
    projectId: string,
  ): Promise<void> {
    // Step 2: Fingerprint extraction
    chapter.chapterFingerprint = await this.collectAiOutput(
      TaskType.FINGERPRINT_EXTRACTION,
      `Extract fingerprint for: ${chapter.content}`,
    );

    // Step 3: FactSheet optimistic lock update
    const currentSheet = this.factSheetByProject.get(projectId) ?? {};
    const updatedSheet = { ...currentSheet };
    const sheetUpdateRaw = await this.collectAiOutput(
      TaskType.FACTSHEET_UPDATE,
      `Update FactSheet with: ${chapter.content}`,
    );
    try {
      const parsed = JSON.parse(sheetUpdateRaw);
      Object.assign(updatedSheet, parsed);
    } catch {
      updatedSheet['chapter_' + chapter.chapterNumber] = {
        annotation: sheetUpdateRaw,
      };
    }
    this.factSheetByProject.set(projectId, updatedSheet);

    // Step 4: Independent review
    const reviewRaw = await this.collectAiOutput(
      TaskType.INDEPENDENT_REVIEW,
      `Review content: ${chapter.content}`,
    );
    chapter.reviewResult = {
      passed: true,
      raw: reviewRaw,
      reviewedAt: new Date().toISOString(),
    };

    // Step 5: Context summary (only if content > 2500 tokens)
    const estimatedTokens = this.estimateTokens(chapter.content!);
    if (estimatedTokens > 2500) {
      chapter.contextSummary = await this.collectAiOutput(
        TaskType.CHAPTER_GENERATION,
        `Summarize: ${chapter.content!.substring(0, 8000)}`,
      );
    }
  }

  private transitionChapterStatus(
    chapterId: string,
    expectedStatus: ChapterData['status'],
    targetStatus: ChapterData['status'],
  ): ChapterData {
    const chapter = this.getChapterOrThrow(chapterId);
    if (chapter.status !== expectedStatus) {
      throw new BadRequestException(
        `Chapter must be ${expectedStatus} (current: ${chapter.status})`,
      );
    }
    chapter.status = targetStatus;
    chapter.updatedAt = new Date();
    return chapter;
  }

  private findChapterById(chapterId: string): ChapterData | null {
    for (const chapters of this.chaptersByProject.values()) {
      const found = chapters.find((c) => c.id === chapterId);
      if (found) return found;
    }
    return null;
  }

  private findPreviousChapter(
    projectId: string,
    chapterNumber: number,
  ): ChapterData | null {
    const chapters = this.chaptersByProject.get(projectId) ?? [];
    if (chapterNumber <= 1) return null;
    return (
      chapters.find((c) => c.chapterNumber === chapterNumber - 1) ?? null
    );
  }

  private estimateTokens(content: string): number {
    // Rough estimation: 1 Chinese character ≈ 1 token, 1 English word ≈ 1.3 tokens
    const chineseChars = (content.match(/[一-鿿]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + Math.ceil(englishWords * 1.3);
  }

  private findBeatById(beatId: string): BeatData | null {
    for (const beats of this.beatsByProject.values()) {
      const found = beats.find((b) => b.id === beatId);
      if (found) return found;
    }
    return null;
  }

  private findChapterForBeat(beat: BeatData): ChapterData | undefined {
    const chapters = this.chaptersByProject.get(beat.projectId) ?? [];
    return chapters.find((c) => c.chapterNumber === beat.chapterNumber);
  }

  private shouldUseR1(beat: BeatData, totalChapters: number): boolean {
    return (
      beat.chapterNumber <= R1_STRUCTURAL_FIRST ||
      beat.chapterNumber >= totalChapters - R1_STRUCTURAL_LAST_OFFSET ||
      beat.hookCount >= R1_HOOK_THRESHOLD ||
      beat.isClimax
    );
  }

  private createChapterFromBeat(beat: BeatData): ChapterData {
    return {
      id: randomUUID(),
      projectId: beat.projectId,
      chapterNumber: beat.chapterNumber,
      title: null,
      beatPlan: beat.plan,
      targetWordCount: beat.targetWordCount,
      content: null,
      status: 'PENDING',
      chapterFingerprint: null,
      contextSummary: null,
      reviewResult: null,
      changeAnalysis: null,
      targetedFixHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseBeatsFromOutput(
    output: string,
    projectId: string,
  ): BeatData[] {
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
        readerExpectation: expectationMatch
          ? expectationMatch[1].trim()
          : '中',
      };

      beats.push({
        id: randomUUID(),
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
    const existing = this.getStepByProjectId(projectId, phaseType);
    if (!existing) {
      throw new BadRequestException(`No generated ${label} to confirm`);
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException(`${label} already confirmed`);
    }
    if (existing.status !== 'AWAITING_REVIEW') {
      throw new BadRequestException(
        `${label} must be AWAITING_REVIEW to confirm (current: ${existing.status})`,
      );
    }
    existing.status = 'CONFIRMED';
    existing.confirmedAt = new Date();
    this.projectService.update(projectId, { status: nextStatus });
    return existing;
  }

  private async rejectPhase(
    projectId: string,
    phaseType: PhaseType,
    label: string,
  ): Promise<StepData> {
    const existing = this.getStepByProjectId(projectId, phaseType);
    if (!existing) {
      throw new BadRequestException(`No generated ${label} to reject`);
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException(`${label} already confirmed`);
    }
    if (existing.status === 'REJECTED') {
      throw new BadRequestException(`${label} already rejected`);
    }
    existing.status = 'REJECTED';
    return existing;
  }

  private createPendingStep(projectId: string, phaseType: PhaseType): StepData {
    const step: StepData = {
      id: randomUUID(),
      projectId,
      phaseType,
      status: 'PENDING',
      input: null,
      output: null,
      review: null,
      version: 0,
      confirmedAt: null,
    };
    this.steps.set(step.id, step);
    return step;
  }

  private async collectAiOutput(taskType: TaskType, prompt: string): Promise<string> {
    const chunks$: Observable<AIGenerateChunk> = this.aiGateway.generate({
      taskType,
      prompt,
    });
    const chunks = await lastValueFrom(chunks$.pipe(toArray()));
    return chunks.map((c) => c.content).join('');
  }

  private extractKeyPlotPoints(output: string): string {
    const lines = output.split('\n').filter((l) => l.match(/情节点\d+/));
    return lines.join('\n');
  }

  private runPacingReview(output: string): Record<string, unknown> {
    const hasMultiAct = /第[一二三四五六七八九十]幕|第[一二三四五六七八九十]章/.test(output);
    return {
      passed: hasMultiAct,
      score: hasMultiAct ? 85 : 50,
      notes: hasMultiAct ? '节奏分布合理' : '缺少多幕/章结构',
    };
  }

  private runConflictReview(output: string): Record<string, unknown> {
    const hasConflict = /冲突|矛盾|对抗|危机|敌人|反派/.test(output);
    return {
      passed: hasConflict,
      notes: hasConflict ? '冲突要素存在' : '缺少冲突要素',
    };
  }

  private runClimaxReview(output: string): Record<string, unknown> {
    const hasClimax = /高潮|决战|终极|巅峰/.test(output);
    return {
      passed: hasClimax,
      notes: hasClimax ? '高潮点存在' : '缺少高潮点',
    };
  }

  private runPowerSystemCheck(output: string): Record<string, unknown> {
    const flags: string[] = [];
    for (const redline of POWER_SYSTEM_REDLINES) {
      const matched = redline.keywords.some((kw) => output.includes(kw));
      if (matched) {
        flags.push(redline.label);
      }
    }
    return {
      passed: flags.length === 0,
      flags,
      checkedAt: new Date().toISOString(),
    };
  }
}
