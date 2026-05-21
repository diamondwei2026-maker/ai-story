import { Injectable } from '@nestjs/common';

const CHARS_PER_TOKEN = 4;

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

@Injectable()
export class ContextBudgetService {
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.round(text.length / CHARS_PER_TOKEN);
  }

  trimToBudget(text: string, maxTokens: number): string {
    if (!text || maxTokens <= 0) return '';
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars);
  }

  calculateBudget(
    globalStatic: string,
    globalDynamic: string,
    local: string,
  ): BudgetResult {
    const warnings: string[] = [];

    let gs = this.trimToBudget(globalStatic, LIMITS.globalStatic);
    let gd = this.trimToBudget(globalDynamic, LIMITS.globalDynamic);
    let lc = this.trimToBudget(local, LIMITS.local);

    if (gs.length < globalStatic.length) {
      warnings.push(`globalStatic trimmed to ${LIMITS.globalStatic} tokens`);
    }
    if (gd.length < globalDynamic.length) {
      warnings.push(`globalDynamic trimmed to ${LIMITS.globalDynamic} tokens`);
    }
    if (lc.length < local.length) {
      warnings.push(`local trimmed to ${LIMITS.local} tokens`);
    }

    let totalTokens =
      this.estimateTokens(gs) +
      this.estimateTokens(gd) +
      this.estimateTokens(lc);

    if (totalTokens > LIMITS.total) {
      const ratio = LIMITS.total / totalTokens;
      const newGsBudget = Math.floor(this.estimateTokens(gs) * ratio);
      const newGdBudget = Math.floor(this.estimateTokens(gd) * ratio);
      const newLcBudget = Math.floor(this.estimateTokens(lc) * ratio);

      gs = this.trimToBudget(gs, newGsBudget);
      gd = this.trimToBudget(gd, newGdBudget);
      lc = this.trimToBudget(lc, newLcBudget);

      totalTokens =
        this.estimateTokens(gs) +
        this.estimateTokens(gd) +
        this.estimateTokens(lc);

      warnings.push(`total budget exceeded, proportionally reduced to ${totalTokens} tokens`);
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
}
