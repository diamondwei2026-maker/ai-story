import { computed, type ComputedRef } from 'vue';
import type { Beat } from '@/stores/useBeatStore';

export type RhythmGrade = 'excellent' | 'good' | 'fair' | 'poor';

export interface RhythmScoreBreakdown {
  baseScore: number;
  climaxScore: number;
  pacingScore: number;
  penalty: number;
}

export interface RhythmWarning {
  startChapter: number;
  endChapter: number;
  message: string;
  suggestion: string;
}

export interface RhythmScore {
  score: number;
  grade: RhythmGrade;
  gradeLabel: string;
  gradeColor: string;
  summaryText: string;
  breakdown: RhythmScoreBreakdown;
  warnings: RhythmWarning[];
}

/**
 * 纯客户端评分——零 AI 调用。
 * 基于 beat 数组的冲突强度、读者期待值、高潮布局、节奏多样性计算 0-100 的综合得分。
 */
export function computeRhythmScore(beats: Beat[]): RhythmScore {
  if (beats.length === 0) {
    return {
      score: 0,
      grade: 'poor',
      gradeLabel: '无数据',
      gradeColor: '#9ca3af',
      summaryText: '暂无细纲数据，无法评估节奏',
      breakdown: { baseScore: 0, climaxScore: 0, pacingScore: 0, penalty: 0 },
      warnings: [],
    };
  }

  // ── 基础分 (0-60)：冲突强度与期待值均值 ──
  const avgIntensity =
    beats.reduce((sum, b) => sum + b.conflictIntensity, 0) / beats.length;
  const avgExpectation =
    beats.reduce((sum, b) => sum + b.readerExpectation, 0) / beats.length;
  const baseScore = Math.round((avgIntensity / 5) * 30 + (avgExpectation / 5) * 30);

  // ── 高潮布局分 (0-20)：高潮章是否均匀分布 ──
  const climaxBeats = beats.filter((b) => b.isClimax);
  let climaxScore = 0;
  if (climaxBeats.length > 0 && beats.length >= 5) {
    const idealMin = Math.max(1, Math.floor(beats.length / 8));
    const idealMax = Math.ceil(beats.length / 5);
    const count = climaxBeats.length;

    if (count >= idealMin && count <= idealMax) {
      climaxScore += 10;
    } else if (count > 0) {
      climaxScore += Math.round(10 * Math.min(count, idealMax) / Math.max(count, idealMax));
    }

    const chapters = climaxBeats.map((b) => b.chapterNumber);
    const gaps: number[] = [];
    for (let i = 1; i < chapters.length; i++) {
      gaps.push(chapters[i] - chapters[i - 1]);
    }
    if (gaps.length > 0) {
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const variance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length;
      const uniformity = Math.max(0, 10 - Math.min(10, variance / 5));
      climaxScore += Math.round(uniformity);
    }
  } else if (beats.length < 5) {
    climaxScore = 10;
  }

  // ── 节奏多样性分 (0-20)：快/中/慢 三种节奏是否都有 ──
  const pacingSet = new Set(
    beats.map((b) => b.pacingLabel).filter((l) => ['快', '中', '慢'].includes(l)),
  );
  const pacingCounts: Record<string, number> = { '快': 0, '中': 0, '慢': 0 };
  for (const b of beats) {
    if (pacingCounts[b.pacingLabel] !== undefined) pacingCounts[b.pacingLabel]++;
  }
  const varietyScore = pacingSet.size * 4;
  const totalLabeled = pacingCounts['快'] + pacingCounts['中'] + pacingCounts['慢'];
  let balanceScore = 0;
  if (totalLabeled > 0) {
    const maxRatio = Math.max(
      pacingCounts['快'] / totalLabeled,
      pacingCounts['中'] / totalLabeled,
      pacingCounts['慢'] / totalLabeled,
    );
    balanceScore = Math.round(Math.max(0, 8 - (maxRatio - 0.4) * 20));
  }
  const pacingScore = Math.min(20, varietyScore + balanceScore);

  // ── 预警检测 + 扣分 ──
  const warnings = detectWarnings(beats);
  const penalty = warnings.length * 5;

  // ── 综合评分 ──
  const rawScore = baseScore + climaxScore + pacingScore - penalty;
  const score = Math.max(0, Math.min(100, rawScore));

  const { grade, gradeLabel, gradeColor } = mapGrade(score);
  const breakdown: RhythmScoreBreakdown = { baseScore, climaxScore, pacingScore, penalty };
  const summaryText = buildSummary(grade, breakdown, warnings, beats.length);

  return { score, grade, gradeLabel, gradeColor, summaryText, breakdown, warnings };
}

function detectWarnings(beats: Beat[]): RhythmWarning[] {
  const result: RhythmWarning[] = [];
  if (beats.length < 3) return result;

  let lowStart = -1;

  // Iterate through all beats except the first (skip index 0 which has no preceding context)
  for (let i = 1; i < beats.length; i++) {
    const b = beats[i];
    const isLast = i === beats.length - 1;

    if (b.readerExpectation <= 2 && b.conflictIntensity <= 2) {
      if (lowStart === -1) lowStart = b.chapterNumber;
      // If this is the last beat and it's low, resolve the streak now
      if (isLast && lowStart !== -1) {
        const endChapter = b.chapterNumber;
        if (endChapter - lowStart >= 2) {
          result.push(buildWarning(lowStart, endChapter));
        }
        lowStart = -1;
      }
    } else {
      if (lowStart !== -1) {
        const endChapter = beats[i - 1].chapterNumber;
        if (endChapter - lowStart >= 2) {
          result.push(buildWarning(lowStart, endChapter));
        }
        lowStart = -1;
      }
    }
  }

  return result;
}

function buildWarning(startChapter: number, endChapter: number): RhythmWarning {
  const range = startChapter === endChapter
    ? `第${startChapter}章`
    : `第${startChapter}-${endChapter}章`;

  return {
    startChapter,
    endChapter,
    message: `${range}冲突强度与期待值持续偏低，可能导致读者中途弃书`,
    suggestion: `建议在${range}增加一个冲突事件（如对手登场、秘密泄露、时间压力）或埋设待解悬念，提升章节张力。`,
  };
}

function mapGrade(score: number): { grade: RhythmGrade; gradeLabel: string; gradeColor: string } {
  if (score >= 80) return { grade: 'excellent', gradeLabel: '优秀', gradeColor: '#16a34a' };
  if (score >= 60) return { grade: 'good', gradeLabel: '良好', gradeColor: '#2563eb' };
  if (score >= 40) return { grade: 'fair', gradeLabel: '一般', gradeColor: '#d97706' };
  return { grade: 'poor', gradeLabel: '需改进', gradeColor: '#dc2626' };
}

function buildSummary(
  grade: RhythmGrade,
  breakdown: RhythmScoreBreakdown,
  warnings: RhythmWarning[],
  chapterCount: number,
): string {
  const parts: string[] = [];

  switch (grade) {
    case 'excellent':
      parts.push('节奏优秀，冲突曲线饱满');
      break;
    case 'good':
      parts.push('节奏良好，整体可读性较强');
      break;
    case 'fair':
      parts.push('节奏存在短板，部分区间需要关注');
      break;
    case 'poor':
      parts.push('节奏薄弱，建议全面优化冲突布局');
      break;
  }

  if (breakdown.climaxScore >= 15) {
    parts.push('高潮分布合理');
  } else if (breakdown.climaxScore <= 5 && chapterCount >= 10) {
    parts.push('高潮布局可进一步优化');
  }

  if (breakdown.pacingScore >= 15) {
    parts.push('节奏张弛有度');
  } else if (breakdown.pacingScore <= 5) {
    parts.push('节奏变化偏少');
  }

  if (warnings.length > 0) {
    parts.push(`${warnings.length}处可优化区间`);
  }

  return parts.join('，');
}

/**
 * Vue composable —— 响应式计算节奏得分。
 */
export function useRhythmScore(beats: ComputedRef<Beat[]>) {
  const score = computed(() => computeRhythmScore(beats.value));
  return { score };
}
