import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import {
  AIGatewayService,
  TaskType,
  AIGenerateChunk,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ChapterData, TargetedFixEntry } from './step.entity';
import { Observable } from 'rxjs';

export type ChangeType = 'no-change' | 'whitespace-only' | 'minor' | 'substantive';

export interface ImpactedChapter {
  chapterNumber: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reason: string;
  status: 'PENDING' | 'FIXED' | 'SKIPPED' | 'DEFERRED';
}

export interface ChangeAnalysisData {
  lastAnalyzedAt: Date;
  sourceChangeFingerprint: string;
  impactedChapters: ImpactedChapter[];
}

export interface AnalyzeChangeResult {
  skipped: boolean;
  reason?: string;
  changeAnalysis?: ChangeAnalysisData;
}

export interface TargetedFixResult {
  patchContent: string;
}

@Injectable()
export class ChangeAnalysisService {
  constructor(
    private readonly stepService: StepService,
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
  ) {}

  detectChangeType(original: string, updated: string): ChangeType {
    // 1. No change
    if (original === updated) {
      return 'no-change';
    }

    // 2. Whitespace-only change — normalize all whitespace sequences
    if (this.normalizeWhitespace(original) === this.normalizeWhitespace(updated)) {
      return 'whitespace-only';
    }

    // 3. Check paragraph-level changes
    const origParagraphs = this.splitParagraphs(original);
    const updParagraphs = this.splitParagraphs(updated);

    const hasParagraphChange =
      origParagraphs.length !== updParagraphs.length ||
      origParagraphs.some((p, i) => {
        const upd = updParagraphs[i] ?? '';
        return Math.abs(p.length - upd.length) > 100;
      });

    // 4. Compute Levenshtein distance
    const distance = this.levenshtein(original, updated);

    // 5. Minor change: distance < 50 AND no paragraph changes
    if (distance < 50 && !hasParagraphChange) {
      return 'minor';
    }

    // 6. Substantive change
    return 'substantive';
  }

  private normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  private levenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;

    // Use two-row optimization for memory efficiency
    let prev = new Array<number>(lenB + 1);
    let curr = new Array<number>(lenB + 1);

    for (let j = 0; j <= lenB; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
      curr[0] = i;
      for (let j = 1; j <= lenB; j++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,       // deletion
          curr[j - 1] + 1,   // insertion
          prev[j - 1] + substitutionCost, // substitution
        );
      }
      // Swap rows
      const temp = prev;
      prev = curr;
      curr = temp;
    }

    return prev[lenB];
  }

  async analyzeChange(
    projectId: string,
    chapterId: string,
    newContent: string,
  ): Promise<AnalyzeChangeResult> {
    // 1. Find the chapter
    const chapter = this.findChapter(projectId, chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    // 2. Validate chapter status
    if (!['COMPLETED', 'DISPUTED'].includes(chapter.status)) {
      throw new BadRequestException(
        `Chapter must be COMPLETED or DISPUTED (current: ${chapter.status})`,
      );
    }

    // 3. Validate newContent
    if (!newContent || newContent.trim().length === 0) {
      throw new BadRequestException('New content must not be empty');
    }

    // 4. Determine change type
    const originalContent = chapter.content ?? '';
    const changeType = this.detectChangeType(originalContent, newContent);

    // 5. Skip for non-substantive changes
    if (changeType !== 'substantive') {
      return { skipped: true, reason: changeType };
    }

    // 6. Run full ChangeAnalysis pipeline for substantive changes
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'change-analysis',
      {
        originalContent,
        newContent,
      },
    );

    const aiOutput = await this.collectAiOutput(
      TaskType.CHANGE_ANALYSIS,
      prompt,
    );

    const parsed = this.parseChangeAnalysisOutput(aiOutput);

    // 7. Build new impacted chapters list (filter NONE, default to PENDING)
    const newImpacted: ImpactedChapter[] = parsed.impactedChapters
      .filter((i: ImpactedChapter) => i.severity !== 'NONE')
      .map((i: ImpactedChapter) => ({
        ...i,
        status: 'PENDING' as const,
      }));

    // 8. Merge DEFERRED entries from old analysis (cleared on re-analysis per spec)
    const severityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const oldAnalysis = chapter.changeAnalysis as Record<string, unknown> | null;
    const oldImpacted = (oldAnalysis?.impactedChapters as ImpactedChapter[]) ?? [];
    for (const oldEntry of oldImpacted) {
      if (oldEntry.status !== 'DEFERRED') continue;
      const existingIndex = newImpacted.findIndex(
        (n) => n.chapterNumber === oldEntry.chapterNumber,
      );
      if (existingIndex >= 0) {
        // Merge: keep DEFERRED status but take the higher severity
        const currentSeverity = newImpacted[existingIndex].severity;
        const oldSeverity = oldEntry.severity;
        newImpacted[existingIndex].severity =
          severityRank[oldSeverity] > severityRank[currentSeverity]
            ? oldSeverity
            : currentSeverity;
        // If the old deferred entry has higher severity, keep it deferred
        if (severityRank[oldSeverity] >= severityRank[currentSeverity]) {
          newImpacted[existingIndex].status = 'DEFERRED';
        }
      } else {
        // Chapter no longer impacted in new analysis, but still has a DEFERRED reminder
        newImpacted.push({ ...oldEntry });
      }
    }

    // 9. Build changeAnalysis and persist to source chapter
    const changeAnalysis: ChangeAnalysisData = {
      lastAnalyzedAt: new Date(),
      sourceChangeFingerprint: parsed.changeFingerprint,
      impactedChapters: newImpacted,
    };

    chapter.changeAnalysis = changeAnalysis as unknown as Record<string, unknown>;
    chapter.status = 'DRAFT';
    chapter.updatedAt = new Date();

    return { skipped: false, changeAnalysis };
  }

  private findChapter(
    projectId: string,
    chapterId: string,
  ): ChapterData | null {
    const chapters = this.stepService.getChaptersByProjectId(projectId);
    return chapters.find((c) => c.id === chapterId) ?? null;
  }

  private async collectAiOutput(
    taskType: TaskType,
    prompt: string,
  ): Promise<string> {
    const chunks$: Observable<AIGenerateChunk> = this.aiGateway.callWithFallback(
      taskType,
      prompt,
    );
    const chunks = await lastValueFrom(chunks$.pipe(toArray()));
    return chunks.map((c) => c.content).join('');
  }

  private parseChangeAnalysisOutput(raw: string): {
    changeFingerprint: string;
    impactedChapters: ImpactedChapter[];
  } {
    try {
      const parsed = JSON.parse(raw) as {
        changeFingerprint: string;
        impactedChapters: ImpactedChapter[];
      };
      return {
        changeFingerprint: parsed.changeFingerprint ?? raw.substring(0, 200),
        impactedChapters: Array.isArray(parsed.impactedChapters)
          ? parsed.impactedChapters
          : [],
      };
    } catch {
      return {
        changeFingerprint: raw.substring(0, 200),
        impactedChapters: [],
      };
    }
  }

  async applyTargetedFix(
    projectId: string,
    sourceChapterId: string,
    impactedChapterId: string,
  ): Promise<TargetedFixResult> {
    // 1. Find source chapter
    const sourceChapter = this.findChapter(projectId, sourceChapterId);
    if (!sourceChapter) {
      throw new NotFoundException('Chapter not found');
    }

    // 2. Find impacted chapter
    const impactedChapter = this.findChapter(projectId, impactedChapterId);
    if (!impactedChapter) {
      throw new NotFoundException('Chapter not found');
    }

    // 3. Extract source change fingerprint
    const ca = (sourceChapter.changeAnalysis as Record<string, unknown>) ?? {};
    const sourceChangeFingerprint =
      (ca.sourceChangeFingerprint as string) ?? '';

    // 4. Call AI to generate patch
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'targeted-fix',
      {
        sourceChapterId,
        impactedChapterId,
      },
    );

    const patchContent = await this.collectAiOutput(
      TaskType.CHANGE_ANALYSIS,
      prompt,
    );

    // 5. Persist to impacted chapter's targetedFixHistory
    const entry: TargetedFixEntry = {
      patchedAt: new Date(),
      sourceChapterId,
      changeFingerprint: sourceChangeFingerprint,
      summary: patchContent.substring(0, 200),
    };
    impactedChapter.targetedFixHistory.push(entry);
    impactedChapter.updatedAt = new Date();

    return { patchContent };
  }

  getDeferredReminders(
    projectId: string,
    chapterId: string,
  ): ImpactedChapter[] {
    // Find the chapter to get its chapterNumber
    const chapter = this.findChapter(projectId, chapterId);
    if (!chapter) {
      return [];
    }

    const targetChapterNumber = chapter.chapterNumber;
    const allChapters = this.stepService.getChaptersByProjectId(projectId);

    // Scan all source chapters for DEFERRED impacted entries targeting this chapter
    const deferred: ImpactedChapter[] = [];
    for (const sourceChapter of allChapters) {
      const ca = sourceChapter.changeAnalysis as Record<string, unknown> | null;
      if (!ca) continue;

      const impactedChapters = ca.impactedChapters as ImpactedChapter[] | undefined;
      if (!impactedChapters) continue;

      for (const entry of impactedChapters) {
        if (
          entry.chapterNumber === targetChapterNumber &&
          entry.status === 'DEFERRED'
        ) {
          deferred.push(entry);
        }
      }
    }

    return deferred;
  }
}
