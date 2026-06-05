import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

interface BeatV2 {
  id: string;
  chapterNumber: number;
  targetWordCount: number;
  isClimax: boolean;
  pacingLabel: string;
  conflictIntensity: number;
  readerExpectation: number;
  hookCausalChain?: any[];
}

function makeBeat(overrides: Partial<BeatV2> = {}): BeatV2 {
  return {
    id: 'beat-1',
    chapterNumber: 1,
    targetWordCount: 3000,
    isClimax: false,
    pacingLabel: '中',
    conflictIntensity: 3,
    readerExpectation: 3,
    ...overrides,
  };
}

const mockBeatsV2: BeatV2[] = [
  makeBeat({ id: 'b1', chapterNumber: 1, conflictIntensity: 4, readerExpectation: 5, pacingLabel: '快' }),
  makeBeat({ id: 'b2', chapterNumber: 2, conflictIntensity: 3, readerExpectation: 4, pacingLabel: '中' }),
  makeBeat({ id: 'b3', chapterNumber: 3, conflictIntensity: 5, readerExpectation: 5, pacingLabel: '快', isClimax: true }),
  makeBeat({ id: 'b4', chapterNumber: 4, conflictIntensity: 2, readerExpectation: 2, pacingLabel: '慢' }),
  makeBeat({ id: 'b5', chapterNumber: 5, conflictIntensity: 3, readerExpectation: 3, pacingLabel: '中' }),
];

describe('BeatsRhythmChart', () => {
  const mountChart = async (props: { beats: BeatV2[] }) => {
    const { default: BeatsRhythmChart } = await import('@/components/BeatsRhythmChart.vue');
    return mount(BeatsRhythmChart, { props });
  };

  it('renders the chart container', async () => {
    const wrapper = await mountChart({ beats: mockBeatsV2 });
    expect(wrapper.find('[data-testid="beats-rhythm-chart"]').exists()).toBe(true);
  });

  it('renders the chart canvas when beats exist', async () => {
    const wrapper = await mountChart({ beats: mockBeatsV2 });
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
    const wrapper = await mountChart({ beats: mockBeatsV2 });
    expect(() => wrapper.unmount()).not.toThrow();
  });

  it('chart canvas is a div element', async () => {
    const wrapper = await mountChart({ beats: mockBeatsV2 });
    const canvas = wrapper.find('[data-testid="rhythm-chart-canvas"]');
    expect(canvas.element).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts beats with V2 fields', async () => {
    const wrapper = await mountChart({ beats: mockBeatsV2 });
    expect(wrapper.vm).toBeDefined();
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
});
