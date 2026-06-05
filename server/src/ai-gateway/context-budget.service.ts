import { Injectable, Inject, Optional } from '@nestjs/common';
import { AI_MODEL_TOKEN, IChatModel } from './ai-gateway.service';

const SUMMARY_THRESHOLD = 2500;
const SUMMARY_TARGET_TOKENS = 400;
// Rough character count hint for AI prompts (display only, not used for budget math)
const CHARS_PER_TOKEN_HINT = 4;

const LIMITS = {
  globalStatic: 3000,
  globalDynamic: 2000,
  local: 3000,
  total: 8000,
};

export interface ContextBudget {
  globalStatic: number;
  globalDynamic: number;
  local: number;
  total: number;
}

export interface BudgetResult {
  globalStatic: string;
  globalDynamic: string;
  local: string;
  budget: ContextBudget;
  warnings: string[];
}

// ─── Step data access interface for computeBudget ──────────────

export interface IStepDataAccess {
  getChapter(projectId: string, chapterId: string): Promise<{
    chapterNumber: number;
    beatPlan: Record<string, unknown> | null;
    content: string | null;
    contextSummary: string | null;
  } | null>;

  getPreviousChapter(
    projectId: string,
    chapterNumber: number,
  ): Promise<{ content: string | null; contextSummary: string | null } | null>;

  getBeat(
    projectId: string,
    chapterNumber: number,
  ): Promise<{ plan: Record<string, unknown> } | null>;

  getIdeaStep(
    projectId: string,
  ): Promise<{ output: string | null } | null>;

  getSettingStep(
    projectId: string,
  ): Promise<{ output: string | null } | null>;

  getFactsheet(
    projectId: string,
  ): Promise<{ entries: Record<string, string> } | null>;
}

export const STEP_DATA_ACCESS = 'STEP_DATA_ACCESS';

function emptyBudgetResult(warning?: string): BudgetResult {
  return {
    globalStatic: '',
    globalDynamic: '',
    local: '',
    budget: { globalStatic: 0, globalDynamic: 0, local: 0, total: 0 },
    warnings: warning ? [warning] : [],
  };
}

function entriesToString(entries: Record<string, unknown>): string {
  return Object.entries(entries)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

@Injectable()
export class ContextBudgetService {
  constructor(
    @Inject(AI_MODEL_TOKEN) private readonly chatModel: IChatModel,
    @Optional()
    @Inject(STEP_DATA_ACCESS)
    private readonly stepData?: IStepDataAccess,
  ) {}

  // ════════════════════════════════════════════════════════════════
  // Token estimation
  // ════════════════════════════════════════════════════════════════

  estimateTokens(text: string): number {
    // CJK-aware heuristic: Chinese ~1.8 chars/token, ASCII ~4 chars/token.
    // Uses codePoint comparisons to prevent tsc compilation corruption of CJK literals.
    if (!text) return 0;
    let asciiCount = 0;
    let cjkCount = 0;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined && (
        (cp >= 0x4E00 && cp <= 0x9FFF) ||   // CJK Unified Ideographs
        (cp >= 0x3000 && cp <= 0x303F) ||   // CJK Symbols & Punctuation
        (cp >= 0xFF00 && cp <= 0xFFEF)       // Halfwidth & Fullwidth Forms
      )) {
        cjkCount++;
      } else {
        asciiCount++;
      }
    }
    return Math.round(asciiCount / 4 + cjkCount / 1.8);
  }

  // ════════════════════════════════════════════════════════════════
  // Trimming
  // ════════════════════════════════════════════════════════════════

  trimToBudget(text: string, maxTokens: number): string {
    if (!text || maxTokens <= 0) return '';
    if (this.estimateTokens(text) <= maxTokens) return text;

    // Binary search for the cut point where estimateTokens ≤ maxTokens.
    // O(n log n) — text is bounded by context window limits (~12K chars max).
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.estimateTokens(text.slice(0, mid)) <= maxTokens) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return text.slice(0, lo);
  }

  // ════════════════════════════════════════════════════════════════
  // Budget calculation with priority-based trimming (Issue #17)
  // ════════════════════════════════════════════════════════════════

  calculateBudget(
    globalStatic: string,
    globalDynamic: string,
    local: string,
  ): BudgetResult {
    const warnings: string[] = [];

    // Step 1: Apply individual hard caps
    let gs = this.trimToBudget(globalStatic, LIMITS.globalStatic);
    let gd = this.trimToBudget(globalDynamic, LIMITS.globalDynamic);
    let lc = this.trimToBudget(local, LIMITS.local);

    if (gs.length < globalStatic.length)
      warnings.push(`globalStatic trimmed to ${LIMITS.globalStatic} tokens`);
    if (gd.length < globalDynamic.length)
      warnings.push(`globalDynamic trimmed to ${LIMITS.globalDynamic} tokens`);
    if (lc.length < local.length)
      warnings.push(`local trimmed to ${LIMITS.local} tokens`);

    // Step 2: Priority-based total budget enforcement
    let totalTokens =
      this.estimateTokens(gs) + this.estimateTokens(gd) + this.estimateTokens(lc);

    if (totalTokens > LIMITS.total) {
      let excess = totalTokens - LIMITS.total;

      const layerMap: Record<string, string> = { gs, gd, lc };
      const tokenMap: Record<string, number> = {
        gs: this.estimateTokens(gs),
        gd: this.estimateTokens(gd),
        lc: this.estimateTokens(lc),
      };

      const priorityKeys: Array<{ key: string; label: string }> = [
        { key: 'lc', label: 'local' },
        { key: 'gd', label: 'globalDynamic' },
        { key: 'gs', label: 'globalStatic' },
      ];

      for (const { key, label } of priorityKeys) {
        if (excess <= 0) break;
        const current = tokenMap[key];
        if (current > 0) {
          const reduction = Math.min(current, excess);
          const newBudget = current - reduction;
          layerMap[key] = this.trimToBudget(layerMap[key], newBudget);
          excess -= reduction;
          warnings.push(`${label} reduced to ${newBudget} tokens (total budget exceeded)`);
        }
      }

      gs = layerMap.gs;
      gd = layerMap.gd;
      lc = layerMap.lc;
      totalTokens =
        this.estimateTokens(gs) + this.estimateTokens(gd) + this.estimateTokens(lc);
    }

    return {
      globalStatic: gs,
      globalDynamic: gd,
      local: lc,
      budget: {
        globalStatic: this.estimateTokens(gs),
        globalDynamic: this.estimateTokens(gd),
        local: this.estimateTokens(lc),
        total: totalTokens,
      },
      warnings,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // computeBudget — assemble three layers from project data (Issue #17 / #21)
  // ════════════════════════════════════════════════════════════════

  async computeBudget(projectId: string, chapterId: string): Promise<BudgetResult> {
    const chapter = await this.stepData?.getChapter(projectId, chapterId);
    if (!chapter) return emptyBudgetResult('Chapter not found');

    // Layer 1: Global Static (SETTING phase)
    const setting = await this.stepData?.getSettingStep(projectId);
    const globalStatic = setting?.output ?? '';

    // Layer 2: Global Dynamic (FactSheet entries)
    const factsheet = await this.stepData?.getFactsheet(projectId);
    const globalDynamic = factsheet?.entries
      ? entriesToString(factsheet.entries)
      : '';

    // Layer 3: Local Context (Beat + previous chapter)
    const local = await this.assembleLocalLayer(projectId, chapter);

    return this.calculateBudget(globalStatic, globalDynamic, local);
  }

  // ════════════════════════════════════════════════════════════════
  // generateContextSummary — AI-powered long-chapter summary (Issue #17)
  // ════════════════════════════════════════════════════════════════

  async generateContextSummary(chapterContent: string): Promise<string | null> {
    if (!chapterContent) return null;

    const tokenCount = this.estimateTokens(chapterContent);
    if (tokenCount <= SUMMARY_THRESHOLD) return null;

    const prompt = [
      `你是一位专业的小说编辑。请为以下章节内容生成一个结构化的上下文摘要，约 ${SUMMARY_TARGET_TOKENS} tokens（约 ${SUMMARY_TARGET_TOKENS * CHARS_PER_TOKEN_HINT} 字符）。`,
      '',
      '摘要必须包含以下三个维度：',
      '- 出场角色：列出本章出现的主要角色及其当前状态',
      '- 关键事件：概括本章发生的关键事件（3-5 句）',
      '- 情感转折：描述本章的情感走向和转折点',
      '',
      '请严格按照以下格式输出：',
      '出场角色：<内容>',
      '关键事件：<内容>',
      '情感转折：<内容>',
      '',
      '章节内容：',
      chapterContent,
    ].join('\n');

    const chunks: string[] = [];
    for await (const chunk of this.chatModel.stream(prompt)) {
      chunks.push(chunk.content);
    }

    return chunks.join('').trim() || null;
  }

  // ════════════════════════════════════════════════════════════════
  // Private helpers
  // ════════════════════════════════════════════════════════════════

  private async assembleLocalLayer(
    projectId: string,
    chapter: { chapterNumber: number; beatPlan: Record<string, unknown> | null },
  ): Promise<string> {
    const parts: string[] = [];

    const beat = await this.stepData?.getBeat(projectId, chapter.chapterNumber);
    if (beat?.plan) {
      parts.push(entriesToString(beat.plan));
    }

    if (chapter.chapterNumber <= 1) {
      const idea = await this.stepData?.getIdeaStep(projectId);
      if (idea?.output) parts.push(idea.output);
    } else {
      const prev = await this.stepData?.getPreviousChapter(projectId, chapter.chapterNumber);
      if (prev?.contextSummary) {
        parts.push(prev.contextSummary);
      } else if (prev?.content) {
        parts.push(prev.content);
      }
    }

    return parts.join('\n');
  }
}
