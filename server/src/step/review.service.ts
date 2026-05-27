import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  ChapterData,
  ReviewVerdict,
  ReviewAction,
  ReviewResult,
  ReviewDimensionResult,
  AiMeta,
} from './step.entity';
import {
  AIGatewayService,
  TaskType,
  AIGenerateChunk,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';

const VALID_VERDICTS: ReviewVerdict[] = [
  'PASS',
  'PASS_WITH_SUGGESTIONS',
  'NEEDS_REVISION',
  'BLOCKED',
];

const VERDICT_ACTIONS: Record<ReviewVerdict, ReviewAction[]> = {
  PASS: [],
  PASS_WITH_SUGGESTIONS: [
    { key: 'adopt_suggestions', label: '采纳建议并重新审核' },
    { key: 'ignore_and_confirm', label: '忽略并确认' },
  ],
  NEEDS_REVISION: [
    { key: 'adopt_and_re_review', label: '采纳修改并重新审核' },
    { key: 'manual_edit', label: '手动修改正文' },
    { key: 'appeal', label: '上诉' },
  ],
  BLOCKED: [
    { key: 'manual_edit', label: '手动修改正文' },
    { key: 'appeal', label: '上诉' },
  ],
};

const DEFAULT_DIMENSION: ReviewDimensionResult = { score: 10, issues: [] };

@Injectable()
export class ReviewService {
  constructor(
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
  ) {}

  // Shared reference to StepService's chapters map
  private chaptersByProject: Map<string, ChapterData[]> = new Map();

  setChapterStore(store: Map<string, ChapterData[]>) {
    this.chaptersByProject = store;
  }

  getAvailableActions(verdict: string): ReviewAction[] {
    if (!verdict || typeof verdict !== 'string') {
      throw new BadRequestException('Invalid verdict');
    }
    if (!VALID_VERDICTS.includes(verdict as ReviewVerdict)) {
      throw new BadRequestException(
        `Unknown verdict: ${verdict}. Valid: ${VALID_VERDICTS.join(', ')}`,
      );
    }
    return VERDICT_ACTIONS[verdict as ReviewVerdict];
  }

  async evaluateChapter(chapterId: string): Promise<ReviewResult> {
    const chapter = this.getChapterOrThrow(chapterId);
    if (!chapter.content) {
      throw new BadRequestException('No content to review');
    }

    const prompt = this.promptLoader.renderTemplate(
      'review',
      'independent-review',
      {
        chapterContent: chapter.content,
        chapterNumber: String(chapter.chapterNumber),
        beatPlan: chapter.beatPlan ? JSON.stringify(chapter.beatPlan) : '',
      },
    );

    const { content: raw } = await this.collectAiOutput(TaskType.INDEPENDENT_REVIEW, prompt);
    const parsed = this.parseAiReviewResponse(raw);

    const result: ReviewResult = this.buildReviewResult(parsed, {
      appealCount: 0,
      reviewedAt: new Date().toISOString(),
    });

    chapter.reviewResult = result;
    chapter.updatedAt = new Date();

    if (result.verdict === 'PASS') {
      chapter.status = 'COMPLETED';
    }

    return result;
  }

  async appealReview(
    chapterId: string,
    reason: string,
  ): Promise<ReviewResult> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Appeal reason must not be empty');
    }

    const currentReview = this.getReviewResultOrThrow(chapterId);
    if (currentReview.appealCount >= 1) {
      throw new BadRequestException('Chapter has already been appealed');
    }

    const chapter = this.getChapterOrThrow(chapterId);
    const prompt = this.promptLoader.renderTemplate(
      'review',
      'appeal-review',
      {
        chapterContent: chapter.content ?? '',
        chapterNumber: String(chapter.chapterNumber),
        originalVerdict: currentReview.verdict,
        originalReview: JSON.stringify(currentReview.dimensions),
        userReason: reason.trim(),
      },
    );

    const { content: raw } = await this.collectAiOutput(TaskType.INDEPENDENT_REVIEW, prompt);
    const parsed = this.parseAiReviewResponse(raw);

    const result: ReviewResult = this.buildReviewResult(parsed, {
      appealCount: currentReview.appealCount + 1,
      appealedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
    });

    chapter.reviewResult = result;
    chapter.updatedAt = new Date();

    if (result.verdict === 'PASS') {
      chapter.status = 'COMPLETED';
    }

    return result;
  }

  getActionsForChapter(chapterId: string): ReviewAction[] {
    const reviewResult = this.getReviewResultOrThrow(chapterId);
    return this.getAvailableActions(reviewResult.verdict);
  }

  async forceDisputeChapter(chapterId: string): Promise<ChapterData> {
    const chapter = this.getChapterOrThrow(chapterId);
    const reviewResult = this.getReviewResultOrThrow(chapterId);
    if (reviewResult.appealCount < 1) {
      throw new BadRequestException(
        'Chapter must have completed the appeal process before force dispute',
      );
    }
    chapter.status = 'DISPUTED';
    chapter.updatedAt = new Date();
    return chapter;
  }

  // ─── Private helpers ──────────────────────────────────────────

  private getChapterOrThrow(chapterId: string): ChapterData {
    const chapter = this.findChapterById(chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
    return chapter;
  }

  private findChapterById(chapterId: string): ChapterData | null {
    for (const chapters of this.chaptersByProject.values()) {
      const found = chapters.find((c) => c.id === chapterId);
      if (found) return found;
    }
    return null;
  }

  private async collectAiOutput(
    taskType: TaskType,
    prompt: string,
  ): Promise<{ content: string; aiMeta: AiMeta }> {
    const chunks$: Observable<AIGenerateChunk> = this.aiGateway.callWithFallback(
      taskType,
      prompt,
    );
    const chunks = await lastValueFrom(chunks$.pipe(toArray()));
    const lastChunk = chunks[chunks.length - 1];
    const content = chunks.map((c) => c.content).join('');
    const aiMeta: AiMeta = {
      modelUsed: lastChunk?.modelUsed ?? this.aiGateway.getModelForTask(taskType),
      degraded: lastChunk?.degraded ?? false,
      failed: lastChunk?.failed ?? false,
    };
    return { content, aiMeta };
  }

  private parseAiReviewResponse(raw: string): ReviewResult {
    try {
      return JSON.parse(raw) as ReviewResult;
    } catch {
      return this.parseReviewFallback(raw);
    }
  }

  private parseReviewFallback(raw: string): ReviewResult {
    const upper = raw.toUpperCase();
    let verdict: ReviewVerdict = 'PASS';
    if (upper.includes('BLOCKED')) verdict = 'BLOCKED';
    else if (upper.includes('NEEDS_REVISION')) verdict = 'NEEDS_REVISION';
    else if (upper.includes('SUGGESTIONS')) verdict = 'PASS_WITH_SUGGESTIONS';

    return {
      verdict,
      dimensions: {
        POLITICAL_SAFETY: DEFAULT_DIMENSION,
        SEXUAL_CONTENT: DEFAULT_DIMENSION,
        VIOLENCE: DEFAULT_DIMENSION,
        VALUES: DEFAULT_DIMENSION,
      },
      overallScore: 8,
      appealCount: 0,
      reviewedAt: new Date().toISOString(),
    };
  }

  private buildReviewResult(
    parsed: ReviewResult,
    overrides: Partial<ReviewResult>,
  ): ReviewResult {
    return {
      verdict: this.normalizeVerdict(parsed.verdict),
      dimensions: {
        POLITICAL_SAFETY:
          parsed.dimensions?.POLITICAL_SAFETY ?? DEFAULT_DIMENSION,
        SEXUAL_CONTENT:
          parsed.dimensions?.SEXUAL_CONTENT ?? DEFAULT_DIMENSION,
        VIOLENCE: parsed.dimensions?.VIOLENCE ?? DEFAULT_DIMENSION,
        VALUES: parsed.dimensions?.VALUES ?? DEFAULT_DIMENSION,
      },
      overallScore: parsed.overallScore ?? 10,
      ...overrides,
    } as ReviewResult;
  }

  private normalizeVerdict(raw: string | undefined): ReviewVerdict {
    if (!raw) return 'PASS';
    const upper = raw.toUpperCase();
    if (upper.includes('BLOCKED')) return 'BLOCKED';
    if (upper.includes('NEEDS_REVISION')) return 'NEEDS_REVISION';
    if (upper.includes('SUGGESTIONS')) return 'PASS_WITH_SUGGESTIONS';
    if (upper === 'PASS') return 'PASS';
    return 'PASS';
  }

  private getReviewResultOrThrow(chapterId: string): ReviewResult {
    const chapter = this.getChapterOrThrow(chapterId);
    const reviewResult = chapter.reviewResult as ReviewResult | null;
    if (!reviewResult || !reviewResult.verdict) {
      throw new BadRequestException('No review result');
    }
    return reviewResult;
  }
}
