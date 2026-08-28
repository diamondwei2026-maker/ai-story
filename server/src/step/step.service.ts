import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import {
  StepData,
  PhaseType,
  BeatData,
  ChapterData,
  ReviewResult,
  AiMeta,
  ImpactResult,
} from './step.entity';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { ProjectStatus, StatusHistoryEntry } from '../project/project.entity';
import {
  AIGatewayService,
  TaskType,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetService } from './factsheet.service';
import { ReviewService } from './review.service';
import {
  matchGenre,
  matchGenreWithPrimary,
  renderDimensionSection,
  getFrontendDimensions,
  type GenreDimension,
} from './genre-dimensions.config';

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
const BEATS_HIGH_VOLUME_THRESHOLD = 35;
const BEATS_HIGH_VOLUME_MODEL = 'deepseek-chat-v3';

// ─── V2 Beat field defaults ───────────────────────────────────
const DEFAULT_INTENSITY = 3;
const DEFAULT_EXPECTATION = 3;
const DEFAULT_PACING = '中';
const VALID_PACING_LABELS = ['快', '中', '慢'] as const;

function clampIntensity(value: number): number {
  return Math.max(1, Math.min(5, value));
}

// ─── Impact Detection (pure structural computation, zero AI calls) ──────

function detectImpact(
  oldBeat: BeatData,
  newBeat: BeatData,
): ImpactResult {
  const affectedChapterNumbers: number[] = [];
  const warnings: string[] = [];

  const oldRefs = new Map<string, number | null>();
  for (const link of oldBeat.hookCausalChain) {
    oldRefs.set(link.hook, link.resolvesInChapter);
  }

  const newRefs = new Map<string, number | null>();
  const newHookNames = new Set<string>();
  for (const link of newBeat.hookCausalChain) {
    newRefs.set(link.hook, link.resolvesInChapter);
    newHookNames.add(link.hook);
  }

  for (const [hookName, resolveChapter] of oldRefs) {
    if (!newHookNames.has(hookName)) {
      if (resolveChapter != null) {
        affectedChapterNumbers.push(resolveChapter);
        warnings.push(`第${resolveChapter}章引用了已删除的钩子"${hookName}"`);
      }
    } else {
      const newTarget = newRefs.get(hookName);
      if (newTarget !== resolveChapter) {
        if (resolveChapter != null) affectedChapterNumbers.push(resolveChapter);
        if (newTarget != null) affectedChapterNumbers.push(newTarget);
        warnings.push(
          `钩子"${hookName}"的回收章节从第${resolveChapter ?? '未知'}章变更为第${newTarget ?? '未知'}章`,
        );
      }
    }
  }

  return {
    affectedChapterNumbers: [...new Set(affectedChapterNumbers)].filter(
      (n) => n !== oldBeat.chapterNumber && n !== newBeat.chapterNumber,
    ),
    warnings,
  };
}

function detectBatchImpact(
  oldBeatsMap: Map<number, BeatData>,
  newBeats: BeatData[],
): ImpactResult {
  const allAffected: number[] = [];
  const allWarnings: string[] = [];

  for (const newBeat of newBeats) {
    const oldBeat = oldBeatsMap.get(newBeat.chapterNumber);
    if (oldBeat) {
      const impact = detectImpact(oldBeat, newBeat);
      allAffected.push(...impact.affectedChapterNumbers);
      allWarnings.push(...impact.warnings);
    }
  }

  return {
    affectedChapterNumbers: [...new Set(allAffected)],
    warnings: allWarnings,
  };
}

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

    // ── 创意来源：优先 opts.idea，其次 project.config.description（skipIdea 模式）───
    const ideaFromOpts = opts.idea ?? '';
    const configDescription =
      typeof (project.config as any)?.description === 'string'
        ? (project.config as any).description
        : '';
    const idea = ideaFromOpts || configDescription || '';
    const currentContent = opts.currentContent ?? '';

    // ── 体裁分析：从 IDEA 阶段提取类型标签，确定动态设定维度 + 文化锚定 ──
    const { dimension, category, typeTags, culturalOrientation } =
      await this.analyzeGenre(projectId, idea, project.config as Record<string, unknown> | undefined);
    const dynamicDimensionSection = renderDimensionSection(dimension);
    const frontendDimensions = getFrontendDimensions(dimension);

    // 类型标签前置到创意中，让 AI 知道自己该写什么体裁
    const ideaWithTags = typeTags
      ? `【类型标签：${typeTags}】\n\n${idea}`
      : idea;

    // ── Step 1: Generate world-building (4 dimensions) ──
    const worldPrompt = this.promptLoader.renderTemplate('creation', 'setting-generation', {
      idea: ideaWithTags,
      currentContent,
      dynamicDimensionSection,
      culturalOrientation,
    });

    step.status = 'AI_GENERATING';
    const { content: worldOutput, aiMeta } = await this.collectAiOutput(TaskType.SETTING, worldPrompt);

    // ── Step 2: Generate characters & relationships based on world setting ──
    const charsPrompt = this.promptLoader.renderTemplate('creation', 'setting-characters-generation', {
      idea: ideaWithTags,
      worldSetting: worldOutput,
      culturalOrientation,
    });

    const { content: charsOutput } = await this.collectAiOutput(TaskType.SETTING, charsPrompt);

    // ── Merge outputs ──
    const output = worldOutput + '\n\n' + charsOutput;

    const updated = await this.prisma.stepData.update({
      where: { id: step.id },
      data: {
        status: 'AWAITING_REVIEW',
        output,
        input: currentContent ? `${idea}\n\n--- 用户编辑内容 ---\n${currentContent}` : idea,
        review: {
          powerSystemCheck: this.runPowerSystemCheck(output),
          annotations: '',
          genreCategory: category,
          settingDimensions: frontendDimensions,
        } as any,
        version: { increment: 1 },
      },
    });
    return this.toStepData(updated);
  }

  /**
   * 体裁分析：从 IDEA 阶段已确认的卖点方案中提取类型标签，
   * 匹配体裁配置，返回动态设定维度 + 文化锚定 + 类型标签。
   * 若 IDEA 数据不可用（如 skipIdea 模式），使用 project.config.genre 和创意文本做匹配。
   */
  private async analyzeGenre(
    projectId: string,
    ideaText: string,
    projectConfig?: Record<string, unknown>,
  ): Promise<{ dimension: GenreDimension; category: string; typeTags: string; culturalOrientation: string }> {
    try {
      // 从 project.config.genre 提取用户选择的题材（逗号分隔的多选，如"历史,蒸汽朋克,群像"）
      const configGenre = typeof projectConfig?.genre === 'string'
        ? projectConfig.genre
        : '';
      // 拆分逗号分隔的标签，第一项为主标签
      const genreTags = configGenre
        ? configGenre.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const primaryGenre = genreTags[0] || '';

      const ideaStep = await this.getIdeaByProjectId(projectId);
      if (!ideaStep || !ideaStep.output) {
        // 无 IDEA 数据（如 skipIdea）：用主标签优先匹配
        const allTags = configGenre
          ? `${configGenre} ${ideaText}`
          : ideaText;
        const result = primaryGenre
          ? matchGenreWithPrimary(allTags, primaryGenre, ideaText)
          : matchGenre(configGenre, ideaText);
        return { ...result, typeTags: configGenre || '' };
      }

      // 从 IDEA output 中提取已确认卖点的类型标签
      const review = ideaStep.review as Record<string, unknown> | null;
      const selectedSellPoint = typeof review?.selectedSellPoint === 'number'
        ? review.selectedSellPoint
        : -1;

      const sellPointBlocks = (ideaStep.output).match(
        /## 卖点方案 \d+:[\s\S]*?(?=\n## 卖点方案 \d+:|\n#+ (?:一句话简介|500字简介)|$)/g,
      ) ?? [];

      // 提取选中卖点的类型标签
      let typeTags = '';
      if (selectedSellPoint >= 0 && sellPointBlocks[selectedSellPoint]) {
        const tagMatch = sellPointBlocks[selectedSellPoint].match(
          /类型标签[：:]\s*(.+)/,
        );
        if (tagMatch) {
          typeTags = tagMatch[1].trim();
        }
      }

      // 如果没找到指定的，从所有卖点中提取
      if (!typeTags) {
        for (const block of sellPointBlocks) {
          const tagMatch = block.match(/类型标签[：:]\s*(.+)/);
          if (tagMatch) {
            typeTags = tagMatch[1].trim();
            break;
          }
        }
      }

      // 合并 IDEA 类型标签 + 用户选择的 genre 标签
      const combinedTags = [typeTags, configGenre].filter(Boolean).join(' ');
      const searchText = `${combinedTags} ${ideaText}`;

      // IDEA 类型标签的主标签（取第一个 + 分隔符前的标签）
      const ideaPrimary = typeTags ? typeTags.split(/[+,，\s]+/)[0].trim() : '';
      const effectivePrimary = ideaPrimary || primaryGenre;

      const result = effectivePrimary
        ? matchGenreWithPrimary(searchText, effectivePrimary, ideaText)
        : matchGenre(combinedTags, ideaText);
      return { ...result, typeTags: [typeTags, configGenre].filter(Boolean).join(',') || '' };
    } catch {
      // 任何异常都 fallback 到默认维度
      const result = matchGenre('', ideaText);
      return { ...result, typeTags: '' };
    }
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

    // 诊断日志：记录 AI 输出清洗前后的状态，便于排查卖点解析失败问题
    console.log(
      `[IDEA-DIAG] projectId=${projectId} rawLen=${output.length} sanitizedLen=${sanitizedOutput.length} ` +
      `hasHeader=${/##\s*卖点方案/.test(sanitizedOutput)} hasSellPointLabel=${/核心卖点/.test(sanitizedOutput)}`,
    );
    if (sanitizedOutput.length === 0) {
      console.warn(`[IDEA-DIAG] ⚠️ 清洗后 output 为空！raw 前 300 字符: ${output.substring(0, 300)}`);
    } else if (!/##\s*卖点方案/.test(sanitizedOutput)) {
      console.warn(`[IDEA-DIAG] ⚠️ 清洗后 output 缺少 '## 卖点方案' 标题！前 300 字符: ${sanitizedOutput.substring(0, 300)}`);
    }

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
    const structure = opts.structure ?? 'web-novel-ten';
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
    opts: { outline?: string; currentContent?: string; defaultWordCount?: number; targetChapterCount?: number },
  ): Promise<BeatData[]> {
    const project = await this.projectService.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'BEATS') throw new BadRequestException('Project status must be BEATS');

    const outline = opts.outline ?? '';
    const currentContent = opts.currentContent ?? '';
    const defaultWordCount = opts.defaultWordCount ?? (project.config as any)?.defaultChapterWordCount ?? 3000;
    const targetChapterCount = opts.targetChapterCount;

    const existingStep = await this.getStepByProjectId(projectId, 'BEATS');
    const step = existingStep ?? (await this.createPendingStep(projectId, 'BEATS'));

    const templateVars: Record<string, string> = {
      outline,
      currentContent,
      defaultWordCount: String(defaultWordCount),
    };
    if (targetChapterCount != null) {
      templateVars.targetChapterCount = String(targetChapterCount);
    }
    const prompt = this.promptLoader.renderTemplate('creation', 'beats-generation', templateVars);

    const effectiveTarget = targetChapterCount ?? 25;
    const modelOverride = effectiveTarget > BEATS_HIGH_VOLUME_THRESHOLD
      ? BEATS_HIGH_VOLUME_MODEL
      : undefined;
    const { content: output, aiMeta } = modelOverride
      ? await this.collectAiOutput(TaskType.BEATS, prompt, modelOverride)
      : await this.collectAiOutput(TaskType.BEATS, prompt);

    const existingBeats = await this.getBeatsByProjectId(projectId);
    const newBeats = this.parseBeatsFromOutput(output, projectId, defaultWordCount);

    // Merge IDs for beats that match by chapter number
    if (existingBeats.length > 0) {
      const idByChapter = new Map(existingBeats.map((b) => [b.chapterNumber, b.id]));
      for (const beat of newBeats) {
        const reusedId = idByChapter.get(beat.chapterNumber);
        if (reusedId) beat.id = reusedId;
      }
    }

    // Replace all beats for this project in DB (batch create)
    await this.prisma.beat.deleteMany({ where: { projectId } });
    const createDataList: any[] = [];
    const beatIndexMap = new Map<number, BeatData>(); // index -> beat for ID update
    for (let i = 0; i < newBeats.length; i++) {
      const beat = newBeats[i];
      const createData: Record<string, unknown> = {
        projectId: beat.projectId,
        chapterNumber: beat.chapterNumber,
        plan: beat.plan,
        targetWordCount: beat.targetWordCount,
        hookCount: beat.hookCount,
        isClimax: beat.isClimax,
        useR1: beat.useR1,
        status: beat.status,
        narrativeSummary: beat.narrativeSummary,
        pacingLabel: beat.pacingLabel,
        hookCausalChain: beat.hookCausalChain,
        conflictIntensity: beat.conflictIntensity,
        readerExpectation: beat.readerExpectation,
        conflictDescription: beat.conflictDescription,
      };
      if (beat.id) {
        createData.id = beat.id;
      }
      createDataList.push(createData);
      beatIndexMap.set(i, beat);
    }
    // Create in parallel batches.
    // Batch size: MongoDB handles 50+ documents per batch without issue.
    // Individual create() is used (over createMany) to capture assigned IDs.
    const BATCH_SIZE = 50;
    const createdIds: Map<number, string> = new Map();
    for (let i = 0; i < createDataList.length; i += BATCH_SIZE) {
      const batch = createDataList.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((data: any) => this.prisma.beat.create({ data })),
      );
      results.forEach((r, j) => {
        createdIds.set(i + j, (r as Record<string, unknown>).id as string);
      });
    }
    for (const [idx, beat] of beatIndexMap) {
      beat.id = createdIds.get(idx) ?? beat.id;
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

    // Compute useR1 for all beats first
    for (const beat of beats) {
      beat.useR1 = this.shouldUseR1(beat, totalChapters);
      beat.status = 'CONFIRMED';
    }

    // Batch update all beats in parallel
    await Promise.all(
      beats.map((beat) =>
        this.prisma.beat.update({
          where: { id: beat.id },
          data: { useR1: beat.useR1, status: 'CONFIRMED' },
        }),
      ),
    );

    // Create chapters from confirmed beats
    const existingChapters = await this.getChaptersByProjectId(projectId);
    if (existingChapters.length === 0) {
      await this.prisma.chapter.createMany({
        data: beats.map((beat) => ({
          projectId: beat.projectId,
          chapterNumber: beat.chapterNumber,
          title: null,
          beatPlan: beat.plan as any,
          targetWordCount: beat.targetWordCount,
          content: null,
          status: 'PENDING' as any,
          chapterFingerprint: null,
          contextSummary: null,
          reviewResult: null,
          changeAnalysis: null,
        })),
      });
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

    // Also update the chapter if it exists (direct query, no N+1 scan)
    const chapter = await this.prisma.chapter.findFirst({
      where: { projectId: beat.projectId, chapterNumber: beat.chapterNumber },
    });
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

    const chapter = await this.prisma.chapter.findFirst({
      where: { projectId: beat.projectId, chapterNumber: beat.chapterNumber },
    });
    if (chapter) {
      await this.prisma.chapter.update({
        where: { id: chapter.id },
        data: { beatPlan: mergedPlan as any },
      });
    }

    return this.toBeat(updated);
  }

  // ─── Issue #26 Phase 1: Beat Adjust & Batch Adjust ────────────

  async adjustBeat(
    projectId: string,
    beatId: string,
    feedback: string,
  ): Promise<{ beat: BeatData; impact: ImpactResult }> {
    const beat = await this.findBeatById(beatId);
    if (!beat) throw new NotFoundException('Beat not found');

    const allBeats = await this.getBeatsByProjectId(projectId);
    const prevBeat = allBeats.find((b) => b.chapterNumber === beat.chapterNumber - 1);
    const nextBeat = allBeats.find((b) => b.chapterNumber === beat.chapterNumber + 1);

    const beatDataStr = this.formatBeatForPrompt(beat);
    const previousAnchor = prevBeat
      ? `第${prevBeat.chapterNumber}章叙事摘要: ${prevBeat.narrativeSummary || '无'}\n收束钩子: ${this.formatHookChain(prevBeat.hookCausalChain)}`
      : '（无前一章，本章为开篇）';
    const nextAnchor = nextBeat
      ? `第${nextBeat.chapterNumber}章叙事摘要: ${nextBeat.narrativeSummary || '无'}`
      : '（无后一章，本章为终章）';

    const prompt = this.promptLoader.renderTemplate('creation', 'beats-adjust', {
      beatData: beatDataStr,
      feedback,
      previousAnchor,
      nextAnchor,
      chapterNumber: String(beat.chapterNumber),
      defaultWordCount: String(beat.targetWordCount),
    });

    const { content: output } = await this.collectAiOutput(TaskType.BEATS, prompt);

    const parsedBeats = this.parseBeatsFromOutput(output, projectId, beat.targetWordCount);
    const newBeat = parsedBeats.find((b) => b.chapterNumber === beat.chapterNumber);
    if (!newBeat) {
      // Fallback: use first beat and override chapter number
      if (parsedBeats.length === 0) {
        throw new BadRequestException('AI failed to generate adjusted beat');
      }
      parsedBeats[0].chapterNumber = beat.chapterNumber;
      parsedBeats[0].id = beat.id;
    } else {
      newBeat.id = beat.id;
      newBeat.chapterNumber = beat.chapterNumber;
    }

    const finalBeat = newBeat ?? parsedBeats[0];
    finalBeat.useR1 = this.shouldUseR1(finalBeat, allBeats.length);
    finalBeat.status = 'STALE';

    // Save old hook chain for impact detection
    const oldHookChain = [...beat.hookCausalChain];
    const oldBeatSnap: BeatData = { ...beat, hookCausalChain: oldHookChain };
    const impact = detectImpact(oldBeatSnap, finalBeat);

    // Update beat in DB
    await this.prisma.beat.update({
      where: { id: beatId },
      data: {
        plan: finalBeat.plan as any,
        targetWordCount: finalBeat.targetWordCount,
        hookCount: finalBeat.hookCount,
        isClimax: finalBeat.isClimax,
        useR1: finalBeat.useR1,
        status: 'STALE',
        narrativeSummary: finalBeat.narrativeSummary,
        pacingLabel: finalBeat.pacingLabel,
        hookCausalChain: finalBeat.hookCausalChain as any,
        conflictIntensity: finalBeat.conflictIntensity,
        readerExpectation: finalBeat.readerExpectation,
        conflictDescription: finalBeat.conflictDescription,
      },
    });

    // Sync chapter beatPlan if exists (direct query, no N+1 scan)
    const chapter = await this.prisma.chapter.findFirst({
      where: { projectId: beat.projectId, chapterNumber: beat.chapterNumber },
    });
    if (chapter) {
      await this.prisma.chapter.update({
        where: { id: chapter.id },
        data: { beatPlan: finalBeat.plan as any },
      });
    }

    return { beat: finalBeat, impact };
  }

  async batchAdjustBeats(
    projectId: string,
    startChapter: number,
    endChapter: number,
    problemDescription: string,
  ): Promise<{ beats: BeatData[]; impact: ImpactResult }> {
    const allBeats = await this.getBeatsByProjectId(projectId);
    const rangeBeats = allBeats.filter(
      (b) => b.chapterNumber >= startChapter && b.chapterNumber <= endChapter,
    );
    if (rangeBeats.length === 0) {
      throw new BadRequestException('No beats found in specified range');
    }

    const beforeBeat = allBeats.find((b) => b.chapterNumber === startChapter - 1);
    const afterBeat = allBeats.find((b) => b.chapterNumber === endChapter + 1);
    const defaultWordCount = rangeBeats[0].targetWordCount;

    const beatsData = rangeBeats.map((b) => this.formatBeatForPrompt(b)).join('\n\n');
    const beforeAnchor = beforeBeat
      ? `第${beforeBeat.chapterNumber}章叙事摘要: ${beforeBeat.narrativeSummary || '无'}\n收束钩子: ${this.formatHookChain(beforeBeat.hookCausalChain)}`
      : '（区间为首段，无前置章节）';
    const afterAnchor = afterBeat
      ? `第${afterBeat.chapterNumber}章叙事摘要: ${afterBeat.narrativeSummary || '无'}`
      : '（区间为末段，无后置章节）';

    const prompt = this.promptLoader.renderTemplate('creation', 'beats-batch-adjust', {
      beatsData,
      beforeAnchor,
      afterAnchor,
      problemDescription,
      defaultWordCount: String(defaultWordCount),
    });

    const { content: output } = await this.collectAiOutput(TaskType.BEATS, prompt);
    const newBeats = this.parseBeatsFromOutput(output, projectId, defaultWordCount);

    // Build old beat map for ID reuse and impact detection
    const oldBeatMap = new Map<number, BeatData>();
    for (const b of rangeBeats) {
      oldBeatMap.set(b.chapterNumber, b);
    }

    const impact = detectBatchImpact(oldBeatMap, newBeats);

    // Update matched beats in DB
    const resultBeats: BeatData[] = [];
    for (const newBeat of newBeats) {
      const oldBeat = oldBeatMap.get(newBeat.chapterNumber);
      if (!oldBeat) continue; // Skip beats outside the adjusted range

      newBeat.id = oldBeat.id;
      newBeat.useR1 = this.shouldUseR1(newBeat, allBeats.length);
      newBeat.status = 'STALE';

      await this.prisma.beat.update({
        where: { id: newBeat.id },
        data: {
          plan: newBeat.plan as any,
          targetWordCount: newBeat.targetWordCount,
          hookCount: newBeat.hookCount,
          isClimax: newBeat.isClimax,
          useR1: newBeat.useR1,
          status: 'STALE',
          narrativeSummary: newBeat.narrativeSummary,
          pacingLabel: newBeat.pacingLabel,
          hookCausalChain: newBeat.hookCausalChain as any,
          conflictIntensity: newBeat.conflictIntensity,
          readerExpectation: newBeat.readerExpectation,
          conflictDescription: newBeat.conflictDescription,
        },
      });

      // Sync chapter beatPlan (direct query, no N+1 scan)
      const chapter = await this.prisma.chapter.findFirst({
        where: { projectId, chapterNumber: newBeat.chapterNumber },
      });
      if (chapter) {
        await this.prisma.chapter.update({
          where: { id: chapter.id },
          data: { beatPlan: newBeat.plan as any },
        });
      }

      resultBeats.push(newBeat);
    }

    return { beats: resultBeats, impact };
  }

  // ─── Private helpers for BEATS Phase ──────────────────────────

  private formatHookChain(chain: { hook: string; resolvesInChapter: number | null }[]): string {
    if (chain.length === 0) return '无';
    return chain
      .map((link, i) => {
        const resolve = link.resolvesInChapter != null ? `→回收于第${link.resolvesInChapter}章` : '';
        return `钩子${i + 1}: ${link.hook}${resolve}`;
      })
      .join(', ');
  }

  private formatBeatForPrompt(beat: BeatData): string {
    return [
      `## Chapter ${beat.chapterNumber}:`,
      `叙事摘要: ${beat.narrativeSummary || '无'}`,
      `冲突描述: ${beat.conflictDescription || '无'}`,
      `钩子因果链: ${this.formatHookChain(beat.hookCausalChain)}`,
      `冲突强度: ${beat.conflictIntensity}`,
      `读者期待值: ${beat.readerExpectation}`,
      `节奏标签: ${beat.pacingLabel}`,
      `目标字数: ${beat.targetWordCount}`,
    ].join('\n');
  }

  async getChaptersByProjectId(projectId: string): Promise<ChapterData[]> {
    const docs = await this.prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    });
    const chapters = docs.map((d) => this.toChapter(d));

    // 后台为已有正文但缺少标题的章节生成标题（fire-and-forget，不阻塞响应）
    const chaptersNeedingTitle = chapters.filter(
      (ch) => ch.content && !ch.title,
    );
    if (chaptersNeedingTitle.length > 0) {
      Promise.allSettled(
        chaptersNeedingTitle.map((ch) =>
          this.generateAndSaveChapterTitle(ch).catch(() => {}),
        ),
      );
    }

    return chapters;
  }

  // ─── DRAFTING Phase: Chapter Generation ──────────────────────

  /**
   * 将生成模式映射为中文写作指令，供 prompt 模板使用。
   * 注意：此函数必须与前端 modeOptions 保持同步。
   */
  private buildModeInstruction(
    mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade',
  ): string {
    switch (mode) {
      case 'new-continue':
        return `## 生成模式：新建续写
你是从零开始全新撰写本章正文。严格以节拍计划为蓝图独立创作，不参考任何已有正文内容。
你需要：
- 根据节拍计划中标注的冲突点、情绪基调、叙事节奏，自主设计场景和人物互动
- 确保本章作为独立叙事单元有完整的起承转合
- 与前文章节摘要保持连续但不重复，自然承接上文伏笔或悬念
- 在节拍计划标注的"钩子预设"处埋设新的伏笔或悬念点`;
      case 'paragraph-rewrite':
        return `## 生成模式：段落改写
你需要在保留现有正文剧情骨架的前提下，重新组织段落结构和叙事节奏。
你需要：
- 保持当前章节现有正文中的人物行为、情节推进、关键对话完全不变
- 重新编排段落顺序和场景节奏：拆分过长的段落、合并琐碎的短段落
- 优化叙事节奏：加速拖沓的过渡段落，扩展冲突或转折场景的描写深度
- 保持对话内容不变，但可调整对话与叙述的比例分配，增强画面节奏感
- 不改变任何伏笔/悬念的埋设位置和内容`;
      case 'style-upgrade':
        return `## 生成模式：文笔升级
你需要在不改变剧情、结构、对话内容的前提下，全面提升文字品质。
你需要：
- 保持当前章节现有正文中的人物行为、情节推进、段落结构和对话内容完全不变
- 提升场景描写的画面感：用具体的感官细节（色彩、声音、气味、触感）替代抽象形容词
- 提升人物塑造的深度：通过细腻的微表情、下意识动作、言行矛盾来折射心理
- 提升对话的自然度：让人物的语气、用词、句式贴合其身份和情境
- 提升节奏的文气：用长短句交替、留白和细节密度变化来控制阅读呼吸感
- 不删减已有伏笔/悬念，但可用更精妙的语言让暗示更自然`;
      default:
        return `## 生成模式：新建续写
你是从零开始全新撰写本章正文。`;
    }
  }

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

    // 段落改写/文笔升级需要传入现有正文作为改写基础
    const needsCurrentContent =
      opts.mode === 'paragraph-rewrite' || opts.mode === 'style-upgrade';

    const chResult = await this.collectAiOutput(
      await this.resolveChapterTaskType(chapter),
      this.promptLoader.renderTemplate('creation', 'chapter-generation', {
        modeInstruction: this.buildModeInstruction(opts.mode),
        currentContent: needsCurrentContent ? (chapter.content ?? '') : '',
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
      data: { content: chResult.content, status: 'DRAFT', reviewResult: null },
    });
    chapter.content = chResult.content;
    chapter.status = 'DRAFT';

    await this.runPostGenerationPipeline(chapter, projectId);

    // Clear internal audit result from post-generation pipeline — user-facing
    // reviewResult is only set when the user explicitly clicks "提交审核".
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: 'PENDING_REVIEW', reviewResult: null },
    });
    chapter.status = 'PENDING_REVIEW';
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
        modeInstruction: this.buildModeInstruction('new-continue'),
        currentContent: opts.currentContent,
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        targetWordCount: String(chapter.targetWordCount),
        feedback: '',
        previousSummary: '',
        globalStatic: budget.globalStatic,
        globalDynamic: budget.globalDynamic,
        localContext: budget.local,
      }),
    );

    const newContent = opts.currentContent + continuation.content;
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { content: newContent, status: 'DRAFT', reviewResult: null },
    });
    chapter.content = newContent;
    chapter.status = 'DRAFT';

    await this.runPostGenerationPipeline(chapter, projectId);

    // Clear internal audit result from post-generation pipeline — user-facing
    // reviewResult is only set when the user explicitly clicks "提交审核".
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: 'PENDING_REVIEW', reviewResult: null },
    });
    chapter.status = 'PENDING_REVIEW';
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

  async saveChapterContent(projectId: string, chapterId: string, content: string): Promise<ChapterData> {
    const chapter = await this.getChapterOrThrow(chapterId);

    // 保存正文时，将非终态章节重置为 PENDING_REVIEW，并清除旧的审核结果。
    // 因为正文内容已改变，之前的审核结论不再有效，用户需要重新提交审核。
    const shouldResetReview = !['COMPLETED', 'DISPUTED'].includes(chapter.status);
    const updateData: Record<string, unknown> = { content };
    if (shouldResetReview) {
      updateData['status'] = 'PENDING_REVIEW';
      updateData['reviewResult'] = null;
    }

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: updateData as any,
    });
    chapter.content = content;
    if (shouldResetReview) {
      chapter.status = 'PENDING_REVIEW';
      chapter.reviewResult = null;
    }
    return chapter;
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
    try {
      await this.runPostGenerationPipelineImpl(chapter, projectId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[PostGeneration] Pipeline failed for chapter ${chapter.id} (ch${chapter.chapterNumber}), ` +
        `content saved but post-processing skipped: ${msg}`,
      );
      // Best-effort: content is already persisted; don't fail the entire generation
    }
  }

  private async runPostGenerationPipelineImpl(chapter: ChapterData, projectId: string): Promise<void> {
    const chapterContent = chapter.content!;

    // Phase 1: 并行执行无需互相等待的 AI 调用（指纹 + 审核 + 标题）
    const [fpResult, reviewResult] = await Promise.all([
      this.collectAiOutput(TaskType.FINGERPRINT_EXTRACTION, `Extract fingerprint for: ${chapterContent}`),
      this.collectAiOutput(TaskType.INDEPENDENT_REVIEW, `Review content: ${chapterContent}`),
      this.generateAndSaveChapterTitle(chapter),
    ]);

    // 写入指纹结果
    await this.prisma.chapter.update({
      where: { id: chapter.id },
      data: { chapterFingerprint: fpResult.content },
    });
    chapter.chapterFingerprint = fpResult.content;

    // Internal audit: run independent review for diagnostics only — do NOT
    // persist to reviewResult. The user-facing reviewResult is exclusively
    // set by the explicit "提交审核" flow (evaluateChapter in review.service.ts).
    // The internal audit has a different shape ({ passed, raw }) and would
    // contaminate the field, causing the ReviewPanel to render prematurely.

    // Step 3: FactSheet update (serial — involves CAS write)
    const sheetUpdateResult = await this.collectAiOutput(
      TaskType.FACTSHEET_UPDATE,
      [
        '你是一位小说事实表维护助手。请从以下章节内容中提取信息，更新事实表。',
        '',
        '## 输出格式（严格 JSON，不要包含 markdown 代码块标记）',
        '{',
        '  "新出场角色": [{"name": "角色名", "identity": "身份简述", "firstChapter": ' + chapter.chapterNumber + ', "type": "常驻配角|阶段性角色|路人"}],',
        '  "角色退场": [{"name": "角色名", "chapter": ' + chapter.chapterNumber + ', "reason": "死亡|离开|隐匿|完成使命|其他", "isPermanent": true}],',
        '  "角色状态变化": [{"name": "角色名", "field": "变化字段（如修为/身份/与主角关系/持有物品）", "oldValue": "旧值（未知则填-）", "newValue": "新值"}],',
        '  "角色关系变化": [{"name1": "角色A", "name2": "角色B", "oldRelation": "旧关系（未知则填-）", "newRelation": "新关系", "reason": "变化原因"}],',
        '  "伏笔进度": [{"id": "伏笔标识", "status": "埋设|推进|回收", "detail": "本章具体内容"}],',
        '  "已用路人命名": ["本章使用的路人姓名列表，用于后续章节去重"]',
        '}',
        '',
        '## 要求',
        '- 只提取本章明确出现的信息，不要推测或编造',
        '- 如果某类信息本章没有，对应数组留空 []',
        '- 角色姓名必须与原文完全一致，不要自行修改',
        '- "已用路人命名"帮助后续章节避免重复使用同一个路人名字',
        '- 确保输出是合法 JSON（双引号、无尾逗号），不要包裹在 ```json 代码块中',
        '',
        '## 章节内容',
        chapterContent,
      ].join('\n'),
    );
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

    // Step 5: Context summary (conditional)
    const estimatedTokens = this.estimateTokens(chapterContent);
    if (estimatedTokens > 2500) {
      const summaryResult = await this.collectAiOutput(TaskType.CHAPTER_GENERATION, `Summarize: ${chapterContent.substring(0, 8000)}`);
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
    // Idempotent: if already at target, just return
    if (chapter.status === targetStatus) {
      return chapter;
    }
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
    return this.contextBudgetService.estimateTokens(content);
  }

  /**
   * 根据章节正文内容 + 节拍计划，调用 AI 生成章节标题，写入 DB 并更新内存对象。
   * 失败时优雅降级（标题非关键路径）。
   */
  private async generateAndSaveChapterTitle(chapter: ChapterData): Promise<void> {
    const chapterContent = chapter.content;

    console.log(
      `[ChapterTitle] ⚡ ENTERED for ch${chapter.chapterNumber} ` +
      `(hasContent=${!!chapterContent}, currentTitle=${chapter.title || 'null'})`,
    );

    if (!chapterContent) {
      console.warn(`[ChapterTitle] Skipped ch${chapter.chapterNumber}: no content`);
      return;
    }

    try {
      const prompt = this.promptLoader.renderTemplate('creation', 'chapter-title-generation', {
        chapterContent: chapterContent.slice(0, 2000),
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
        chapterNumber: String(chapter.chapterNumber),
      });
      const result = await this.collectAiOutput(TaskType.CHAPTER_TITLE, prompt);

      if (result.content && result.content.trim()) {
        const title = result.content.trim().slice(0, 50);
        await this.prisma.chapter.update({
          where: { id: chapter.id },
          data: { title },
        });
        chapter.title = title;
        console.log(
          `[ChapterTitle] Generated title for ch${chapter.chapterNumber}: "${title}"`,
        );
      } else {
        console.warn(
          `[ChapterTitle] Empty title returned for ch${chapter.chapterNumber}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[ChapterTitle] Failed to generate title for ch${chapter.chapterNumber}: ${msg}`,
      );
    }
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

  private parseBeatsFromOutput(output: string, projectId: string, defaultWordCount = 3000): BeatData[] {
    const beats: BeatData[] = [];
    const sections = output.split(/## Chapter \d+:/g).slice(1);
    const headerMatches = output.match(/## Chapter (\d+):/g);

    if (!headerMatches) return beats;

    for (let i = 0; i < headerMatches.length; i++) {
      const numMatch = headerMatches[i].match(/Chapter (\d+):/);
      if (!numMatch) continue;
      const chapterNumber = parseInt(numMatch[1], 10);
      const body = sections[i] ?? '';

      // ─── V2 fields ──────────────────────────────────────
      const narrativeMatch = body.match(/叙事摘要:\s*(.+)/);
      const conflictDescMatch = body.match(/冲突描述:\s*(.+)/);
      const causalChainMatch = body.match(/钩子因果链:\s*(.+)/);
      const intensityMatch = body.match(/冲突强度:\s*(\d+)/);
      const expectationNumMatch = body.match(/读者期待值:\s*(\d+)/);
      const pacingMatch = body.match(/节奏标签:\s*(.+)/);

      // ─── V1 fields (fallback) ───────────────────────────
      const conflictMatch = body.match(/冲突点:\s*(.+)/);
      const hooksMatch = body.match(/钩子预设:\s*(.+)/);
      const expectationTextMatch = body.match(/读者期待值:\s*(.+)/);
      const wordCountMatch = body.match(/目标字数:\s*(\d+)/);

      // Parse hookCausalChain (V2) or hookPresets (V1)
      let hookCausalChain: { hook: string; resolvesInChapter: number | null }[] = [];
      let hookPresets: string[] = [];
      let hookCount = 0;

      if (causalChainMatch) {
        // V2: "钩子1: 内容→回收于第3章, 钩子2: 内容→回收于第5章"
        const chainText = causalChainMatch[1];
        const links = chainText.split(/[,，]/);
        for (let j = 0; j < links.length; j++) {
          const link = links[j].trim();
          if (!link) continue;
          // Parse "钩子N: description→回收于第X章" or just "钩子N: description"
          const resolveMatch = link.match(/(.+?)→回收于第(\d+)章/);
          if (resolveMatch) {
            hookCausalChain.push({
              hook: resolveMatch[1].trim(),
              resolvesInChapter: parseInt(resolveMatch[2], 10),
            });
          } else {
            // Strip "钩子N: " prefix if present
            const hookText = link.replace(/^钩子\d+\s*[:：]\s*/, '').trim();
            hookCausalChain.push({ hook: hookText, resolvesInChapter: null });
          }
        }
        hookCount = hookCausalChain.length;
      } else if (hooksMatch) {
        // V1: comma-separated hook names
        hookPresets = hooksMatch[1].split(/[,，、]/).map((h) => h.trim()).filter(Boolean);
        hookCount = hookPresets.length;
        // Convert V1 presets to V2 causal chain (resolvesInChapter unknown)
        hookCausalChain = hookPresets.map((h) => ({ hook: h, resolvesInChapter: null }));
      }

      // Parse conflictDescription (V2) or fallback to conflictPoint (V1)
      const conflictDescription = conflictDescMatch
        ? conflictDescMatch[1].trim()
        : (conflictMatch ? conflictMatch[1].trim() : '');

      // Parse narrativeSummary
      const narrativeSummary = narrativeMatch ? narrativeMatch[1].trim() : '';

      // Parse conflictIntensity (V2) with default
      const conflictIntensity = intensityMatch
        ? clampIntensity(parseInt(intensityMatch[1], 10))
        : DEFAULT_INTENSITY;

      // Parse readerExpectation as number (V2: 1-5, V1: text→number)
      let readerExpectation = DEFAULT_EXPECTATION;
      if (expectationNumMatch) {
        readerExpectation = clampIntensity(parseInt(expectationNumMatch[1], 10));
      } else if (expectationTextMatch) {
        readerExpectation = this.textExpectationToNumber(expectationTextMatch[1].trim());
      }

      // Parse pacingLabel (V2) with default
      const rawPacing = pacingMatch ? pacingMatch[1].trim() : '';
      const pacingLabel = (VALID_PACING_LABELS as readonly string[]).includes(rawPacing)
        ? rawPacing
        : DEFAULT_PACING;

      // Build plan (V1 fields preserved for backward compatibility)
      const plan: Record<string, unknown> = {
        conflictPoint: conflictMatch ? conflictMatch[1].trim() : conflictDescription,
        hookPresets,
        readerExpectation: expectationTextMatch
          ? expectationTextMatch[1].trim()
          : this.numberExpectationToText(readerExpectation),
      };

      beats.push({
        id: '',
        projectId,
        chapterNumber,
        plan,
        targetWordCount: wordCountMatch ? parseInt(wordCountMatch[1], 10) : defaultWordCount,
        hookCount,
        isClimax: false,
        useR1: false,
        status: 'PENDING',
        narrativeSummary,
        conflictDescription,
        pacingLabel,
        hookCausalChain,
        conflictIntensity,
        readerExpectation,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return beats;
  }

  private textExpectationToNumber(text: string): number {
    const normalized = text.trim();
    if (normalized === '高') return 5;
    if (normalized === '中') return DEFAULT_EXPECTATION;
    if (normalized === '低') return 1;
    return DEFAULT_EXPECTATION;
  }

  private numberExpectationToText(num: number): string {
    if (num >= 5) return '高';
    if (num >= 3) return '中';
    return '低';
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

    // Verify project exists before mutating step (avoid orphaned confirmed step)
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new BadRequestException(`Project ${projectId} not found — cannot confirm ${label} with missing project`);
    }

    try {
      await this.prisma.stepData.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
    } catch (e) {
      console.error(`[confirmPhase] Failed to update stepData ${existing.id}:`, e);
      throw new InternalServerErrorException(`Failed to confirm ${label}: database write error`);
    }
    try {
      const updatedProject = await this.projectService.update(projectId, { status: nextStatus });
      if (!updatedProject) {
        console.error(`[confirmPhase] Project ${projectId} vanished during confirm of ${label}`);
        throw new InternalServerErrorException(`Failed to update project status to ${nextStatus}`);
      }
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      console.error(`[confirmPhase] Failed to update project ${projectId}:`, e);
      throw new InternalServerErrorException(`Failed to update project status to ${nextStatus}`);
    }

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
    modelOverride?: string,
  ): Promise<{ content: string; aiMeta: AiMeta }> {
    return this.aiGateway.collectFullOutput(taskType, prompt, modelOverride);
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
    const plan = (doc['plan'] as Record<string, unknown>) ?? {};

    // ─── V2 columns from DB (may be defaults for V1 data) ──────
    const narrativeSummary = (doc['narrativeSummary'] as string) ?? '';
    const pacingLabelRaw = (doc['pacingLabel'] as string) ?? '';
    const pacingLabel = (VALID_PACING_LABELS as readonly string[]).includes(pacingLabelRaw)
      ? pacingLabelRaw
      : DEFAULT_PACING;
    const conflictIntensity = clampIntensity(Number(doc['conflictIntensity'] ?? DEFAULT_INTENSITY));
    const readerExpectation = clampIntensity(Number(doc['readerExpectation'] ?? DEFAULT_EXPECTATION));

    // ─── hookCausalChain: V2 column or V1 downgrade ─────────
    let hookCausalChain: { hook: string; resolvesInChapter: number | null }[] = [];
    const chainFromDb = doc['hookCausalChain'];
    if (Array.isArray(chainFromDb) && chainFromDb.length > 0) {
      hookCausalChain = chainFromDb as typeof hookCausalChain;
    } else if (plan.hookPresets && Array.isArray(plan.hookPresets)) {
      // V1→V2 downgrade: derive from plan.hookPresets
      hookCausalChain = (plan.hookPresets as string[]).map((h) => ({
        hook: h,
        resolvesInChapter: null,
      }));
    }

    // ─── conflictDescription: V2 column or V1 downgrade ──────
    let conflictDescription = (doc['conflictDescription'] as string) ?? '';
    if (!conflictDescription && plan.conflictPoint) {
      conflictDescription = plan.conflictPoint as string;
    }

    return {
      id: doc['id'] as string,
      projectId: doc['projectId'] as string,
      chapterNumber: doc['chapterNumber'] as number,
      plan,
      targetWordCount: (doc['targetWordCount'] as number) ?? 3000,
      hookCount: (doc['hookCount'] as number) ?? 0,
      isClimax: (doc['isClimax'] as boolean) ?? false,
      useR1: (doc['useR1'] as boolean) ?? false,
      status: (doc['status'] as BeatData['status']) ?? 'PENDING',
      narrativeSummary,
      conflictDescription,
      pacingLabel,
      hookCausalChain,
      conflictIntensity,
      readerExpectation,
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
