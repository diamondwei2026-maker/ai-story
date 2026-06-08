import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Beat } from '@/stores/useBeatStore';

// ── 测试用 Beat mock ──
function makeBeat(overrides: Partial<Beat> & { id: string; chapterNumber: number }): Beat {
  return {
    projectId: 'proj-1',
    plan: {},
    targetWordCount: 3000,
    hookCount: 0,
    useR1: false,
    status: 'CONFIRMED' as Beat['status'],
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

const healthyBeats: Beat[] = [
  makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 5, pacingLabel: '快' }),
  makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 3, readerExpectation: 4, pacingLabel: '中' }),
  makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 5, readerExpectation: 5, pacingLabel: '快', isClimax: true }),
  makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 2, readerExpectation: 2, pacingLabel: '慢' }),
  makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '中' }),
];

const warningBeats: Beat[] = [
  makeBeat({ id: 'w1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
  makeBeat({ id: 'w2', chapterNumber: 2, conflictIntensity: 1, readerExpectation: 2, pacingLabel: '慢' }),
  makeBeat({ id: 'w3', chapterNumber: 3, conflictIntensity: 1, readerExpectation: 1, pacingLabel: '慢' }),
  makeBeat({ id: 'w4', chapterNumber: 4, conflictIntensity: 2, readerExpectation: 2, pacingLabel: '慢' }),
  makeBeat({ id: 'w5', chapterNumber: 5, conflictIntensity: 4, readerExpectation: 4, pacingLabel: '快' }),
];

describe('BeatsRhythmChart', () => {
  const mountChart = async (props: { beats: Beat[] }) => {
    const { default: BeatsRhythmChart } = await import('@/components/BeatsRhythmChart.vue');
    return mount(BeatsRhythmChart, { props });
  };

  // ── 基础渲染 ──
  it('renders the chart container', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('[data-testid="beats-rhythm-chart"]').exists()).toBe(true);
  });

  it('renders the chart canvas when beats exist', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('[data-testid="rhythm-chart-canvas"]').exists()).toBe(true);
  });

  it('renders empty state when no beats', async () => {
    const wrapper = await mountChart({ beats: [] });
    expect(wrapper.find('[data-testid="rhythm-chart-empty"]').exists()).toBe(true);
  });

  it('hides chart canvas when no beats', async () => {
    const wrapper = await mountChart({ beats: [] });
    expect(wrapper.find('[data-testid="rhythm-chart-canvas"]').exists()).toBe(false);
  });

  it('cleans up echarts instance on unmount', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(() => wrapper.unmount()).not.toThrow();
  });

  it('chart canvas is a div element', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    const canvas = wrapper.find('[data-testid="rhythm-chart-canvas"]');
    expect(canvas.element).toBeInstanceOf(HTMLDivElement);
  });

  it('handles single beat without error', async () => {
    const singleBeat = [makeBeat({ id: 'b1', chapterNumber: 1 })];
    const wrapper = await mountChart({ beats: singleBeat });
    expect(wrapper.find('[data-testid="rhythm-chart-canvas"]').exists()).toBe(true);
  });

  it('handles beats with extreme values (1 and 5)', async () => {
    const extremes = [
      makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 1, readerExpectation: 1 }),
      makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 5, readerExpectation: 5 }),
    ];
    const wrapper = await mountChart({ beats: extremes });
    expect(wrapper.vm).toBeDefined();
  });

  // ── 新增：评分横幅 ──
  it('renders score banner when beats exist', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('[data-testid="rhythm-score-banner"]').exists()).toBe(true);
  });

  it('does not render score banner when no beats', async () => {
    const wrapper = await mountChart({ beats: [] });
    expect(wrapper.find('[data-testid="rhythm-score-banner"]').exists()).toBe(false);
  });

  it('score banner shows a numeric score', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    const scoreEl = wrapper.find('[data-testid="rhythm-score-banner"] .score-number');
    expect(scoreEl.exists()).toBe(true);
    expect(Number(scoreEl.text())).toBeGreaterThanOrEqual(0);
    expect(Number(scoreEl.text())).toBeLessThanOrEqual(100);
  });

  // ── 新增：帮助抽屉 ──
  it('help button is present', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('[data-testid="rhythm-help-btn"]').exists()).toBe(true);
  });

  // ── 新增：增强预警（含优化建议） ──
  it('renders warnings for low-quality beats', async () => {
    const wrapper = await mountChart({ beats: warningBeats });
    expect(wrapper.find('[data-testid="rhythm-warnings"]').exists()).toBe(true);
  });

  it('warning card includes optimization suggestion text', async () => {
    const wrapper = await mountChart({ beats: warningBeats });
    const suggestion = wrapper.find('.warning-suggestion');
    expect(suggestion.exists()).toBe(true);
    expect(suggestion.text()).toBeTruthy();
  });

  it('warning card includes action hint text', async () => {
    const wrapper = await mountChart({ beats: warningBeats });
    const hint = wrapper.find('.warning-action-hint');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain('AI');
  });

  it('emits batch-optimize on button click', async () => {
    const wrapper = await mountChart({ beats: warningBeats });
    await wrapper.find('[data-testid="rhythm-optimize-btn"]').trigger('click');
    expect(wrapper.emitted('batch-optimize')).toBeTruthy();
    expect(wrapper.emitted('batch-optimize')?.[0]).toEqual([2, 4, expect.any(String)]);
  });

  it('no warnings for healthy beats', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('[data-testid="rhythm-warnings"]').exists()).toBe(false);
  });
});
