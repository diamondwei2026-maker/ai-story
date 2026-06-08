import { describe, it, expect } from 'vitest';
import { computeRhythmScore } from '../useRhythmScore';
import type { Beat } from '@/stores/useBeatStore';

function makeBeat(overrides: Partial<Beat> & { id: string; chapterNumber: number }): Beat {
  return {
    projectId: 'proj-1',
    plan: {},
    targetWordCount: 3000,
    hookCount: 0,
    useR1: false,
    status: 'CONFIRMED',
    narrativeSummary: '',
    conflictDescription: '',
    hookCausalChain: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    pacingLabel: '中',
    conflictIntensity: 3,
    readerExpectation: 3,
    isClimax: false,
    ...overrides,
  };
}

describe('computeRhythmScore', () => {
  it('returns zero score for empty beats', () => {
    const result = computeRhythmScore([]);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('poor');
    expect(result.gradeLabel).toBe('无数据');
    expect(result.warnings).toHaveLength(0);
  });

  it('returns high score for strong beats', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '中' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 5, readerExpectation: 5, pacingLabel: '快', isClimax: true }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 3, readerExpectation: 4, pacingLabel: '中' }),
      makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 4, readerExpectation: 5, pacingLabel: '快', isClimax: true }),
      makeBeat({ id: 'b6', chapterNumber: 6, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '慢' }),
      makeBeat({ id: 'b7', chapterNumber: 7, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '中' }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade).toMatch(/^(excellent|good)$/);
  });

  it('returns low score for weak beats', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 1, readerExpectation: 1, pacingLabel: '慢' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 1, readerExpectation: 2, pacingLabel: '慢' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 2, readerExpectation: 1, pacingLabel: '慢' }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 1, readerExpectation: 2, pacingLabel: '慢' }),
      makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 2, readerExpectation: 1, pacingLabel: '慢' }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('detects warnings for consecutive low chapters', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 1, readerExpectation: 2, pacingLabel: '慢' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 1, readerExpectation: 1, pacingLabel: '慢' }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 2, readerExpectation: 2, pacingLabel: '慢' }),
      makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].startChapter).toBe(2);
    expect(result.warnings[0].endChapter).toBe(4);
    expect(result.warnings[0].suggestion).toBeTruthy();
  });

  it('does not flag single-chapter dips as warnings', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 1, readerExpectation: 1, pacingLabel: '慢' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.warnings).toHaveLength(0);
  });

  it('summary text is non-empty for non-empty beats', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 3, readerExpectation: 3 }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.summaryText).toBeTruthy();
    expect(result.summaryText.length).toBeGreaterThan(0);
  });

  it('grade colors are valid hex color codes', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 5, readerExpectation: 5 }),
    ];
    const result = computeRhythmScore(beats);
    expect(result.gradeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('breakdown fields sum approximately to score', () => {
    const beats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '中' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '慢' }),
    ];
    const result = computeRhythmScore(beats);
    const { baseScore, climaxScore, pacingScore, penalty } = result.breakdown;
    const breakdownSum = baseScore + climaxScore + pacingScore - penalty;
    expect(Math.abs(result.score - breakdownSum)).toBeLessThanOrEqual(1);
  });

  it('pacing variety boosts score', () => {
    const monoBeats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
    ];
    const mono = computeRhythmScore(monoBeats);

    const variedBeats: Beat[] = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '中' }),
      makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '慢' }),
      makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
      makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '中' }),
    ];
    const varied = computeRhythmScore(variedBeats);

    expect(varied.breakdown.pacingScore).toBeGreaterThan(mono.breakdown.pacingScore);
  });
});
