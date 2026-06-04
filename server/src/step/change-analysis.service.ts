import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, TaskType } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';

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
    private readonly prisma: PrismaService,
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
  ) {}

  detectChangeType(original: string, updated: string): ChangeType {
    if (original === updated) return 'no-change';
    if (this.normalizeWhitespace(original) === this.normalizeWhitespace(updated)) return 'whitespace-only';

    const origParagraphs = this.splitParagraphs(original);
    const updParagraphs = this.splitParagraphs(updated);

    const hasParagraphChange =
      origParagraphs.length !== updParagraphs.length ||
      origParagraphs.some((p, i) => {
        const upd = updParagraphs[i] ?? '';
        return Math.abs(p.length - upd.length) > 100;
      });

    const distance = this.levenshtein(original, updated);
    if (distance < 50 && !hasParagraphChange) return 'minor';
    return 'substantive';
  }

  private normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private splitParagraphs(text: string): string[] {
    return text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  }

  private levenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;
    let prev = new Array<number>(lenB + 1);
    let curr = new Array<number>(lenB + 1);
    for (let j = 0; j <= lenB; j++) prev[j] = j;

    for (let i = 1; i <= lenA; i++) {
      curr[0] = i;
      for (let j = 1; j <= lenB; j++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + substitutionCost);
      }
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
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Chapter not found');

    const ch = chapter as unknown as Record<string, unknown>;
    if (!['COMPLETED', 'DISPUTED'].includes(ch.status as string)) {
      throw new BadRequestException(`Chapter must be COMPLETED or DISPUTED (current: ${ch.status})`);
    }

    if (!newContent || newContent.trim().length === 0) {
      throw new BadRequestException('New content must not be empty');
    }

    const originalContent = (ch.content as string) ?? '';
    const changeType = this.detectChangeType(originalContent, newContent);

    if (changeType !== 'substantive') {
      return { skipped: true, reason: changeType };
    }

    const prompt = this.promptLoader.renderTemplate('creation', 'change-analysis', { originalContent, newContent });
    const aiOutput = await this.collectAiOutput(TaskType.CHANGE_ANALYSIS, prompt);
    const parsed = this.parseChangeAnalysisOutput(aiOutput);

    const newImpacted: ImpactedChapter[] = parsed.impactedChapters
      .filter((i: ImpactedChapter) => i.severity !== 'NONE')
      .map((i: ImpactedChapter) => ({ ...i, status: 'PENDING' as const }));

    const severityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const oldAnalysis = ch.changeAnalysis as Record<string, unknown> | null;
    const oldImpacted = (oldAnalysis?.impactedChapters as ImpactedChapter[]) ?? [];
    for (const oldEntry of oldImpacted) {
      if (oldEntry.status !== 'DEFERRED') continue;
      const existingIndex = newImpacted.findIndex((n) => n.chapterNumber === oldEntry.chapterNumber);
      if (existingIndex >= 0) {
        const currentSeverity = newImpacted[existingIndex].severity;
        const oldSeverity = oldEntry.severity;
        newImpacted[existingIndex].severity =
          severityRank[oldSeverity] > severityRank[currentSeverity] ? oldSeverity : currentSeverity;
        if (severityRank[oldSeverity] >= severityRank[currentSeverity]) {
          newImpacted[existingIndex].status = 'DEFERRED';
        }
      } else {
        newImpacted.push({ ...oldEntry });
      }
    }

    const changeAnalysis: ChangeAnalysisData = {
      lastAnalyzedAt: new Date(),
      sourceChangeFingerprint: parsed.changeFingerprint,
      impactedChapters: newImpacted,
    };

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: {
        changeAnalysis: changeAnalysis as any,
        status: 'DRAFT',
      },
    });

    return { skipped: false, changeAnalysis };
  }

  private async collectAiOutput(taskType: TaskType, prompt: string): Promise<string> {
    const result = await this.aiGateway.collectFullOutput(taskType, prompt);
    return result.content;
  }

  private parseChangeAnalysisOutput(raw: string): {
    changeFingerprint: string;
    impactedChapters: ImpactedChapter[];
  } {
    try {
      const parsed = JSON.parse(raw) as { changeFingerprint: string; impactedChapters: ImpactedChapter[] };
      return {
        changeFingerprint: parsed.changeFingerprint ?? raw.substring(0, 200),
        impactedChapters: Array.isArray(parsed.impactedChapters) ? parsed.impactedChapters : [],
      };
    } catch {
      return { changeFingerprint: raw.substring(0, 200), impactedChapters: [] };
    }
  }

  async applyTargetedFix(
    projectId: string,
    sourceChapterId: string,
    impactedChapterId: string,
  ): Promise<TargetedFixResult> {
    const srcChapter = await this.prisma.chapter.findUnique({ where: { id: sourceChapterId } });
    if (!srcChapter) throw new NotFoundException('Chapter not found');

    const impChapter = await this.prisma.chapter.findUnique({ where: { id: impactedChapterId } });
    if (!impChapter) throw new NotFoundException('Chapter not found');

    const srcCh = srcChapter as unknown as Record<string, unknown>;
    const impCh = impChapter as unknown as Record<string, unknown>;
    const ca = (srcCh.changeAnalysis as Record<string, unknown>) ?? {};
    const sourceChangeFingerprint = (ca.sourceChangeFingerprint as string) ?? '';

    const prompt = this.promptLoader.renderTemplate('creation', 'targeted-fix', { sourceChapterId, impactedChapterId });
    const patchContent = await this.collectAiOutput(TaskType.CHANGE_ANALYSIS, prompt);

    const entry = {
      patchedAt: new Date().toISOString(),
      sourceChapterId,
      changeFingerprint: sourceChangeFingerprint,
      summary: patchContent.substring(0, 200),
    };

    const existingHistory = (impCh.targetedFixHistory as Array<Record<string, unknown>>) ?? [];
    const newHistory = [...existingHistory, entry];

    await this.prisma.chapter.update({
      where: { id: impactedChapterId },
      data: { targetedFixHistory: newHistory as any },
    });

    return { patchContent };
  }

  async getDeferredReminders(projectId: string, chapterId: string): Promise<ImpactedChapter[]> {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) return [];

    const targetChapterNumber = (chapter as unknown as Record<string, unknown>).chapterNumber as number;
    const allChapters = await this.prisma.chapter.findMany({
      where: { projectId },
      select: { changeAnalysis: true },
    });

    const deferred: ImpactedChapter[] = [];
    for (const ch of allChapters) {
      const ca = (ch as unknown as Record<string, unknown>).changeAnalysis as Record<string, unknown> | null;
      if (!ca) continue;
      const impactedChapters = ca.impactedChapters as ImpactedChapter[] | undefined;
      if (!impactedChapters) continue;
      for (const entry of impactedChapters) {
        if (entry.chapterNumber === targetChapterNumber && entry.status === 'DEFERRED') {
          deferred.push(entry);
        }
      }
    }
    return deferred;
  }
}
