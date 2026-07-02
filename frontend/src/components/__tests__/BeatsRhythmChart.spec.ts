import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Beat } from '@/stores/useBeatStore';

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

  // ── Bar chart ──
  it('renders bar chart when beats exist', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.findAll('.rhythm-chart__bar').length).toBe(healthyBeats.length);
  });

  it('bar chart labels match chapter numbers', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    const labels = wrapper.findAll('.rhythm-chart__bar-label');
    expect(labels[0].text()).toBe('1');
    expect(labels[labels.length - 1].text()).toBe(String(healthyBeats.length));
  });

  // ── Stat cards ──
  it('renders 3 stat cards when beats exist', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.findAll('.rhythm-stat-card').length).toBe(3);
  });

  it('stat cards show correct values', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    const values = wrapper.findAll('.rhythm-stat-card__value');
    // avg intensity for healthyBeats = (4+3+5+2+3)/5 = 3.4
    expect(values[1].text()).toBe('3.4');
    // climax count = 1 (b3)
    expect(values[2].text()).toBe('1');
  });

  // ── Warning banner ──
  it('renders warning for warning data', async () => {
    const wrapper = await mountChart({ beats: warningBeats });
    expect(wrapper.find('.rhythm-warning').exists()).toBe(true);
  });

  it('no warning for healthy beats', async () => {
    const wrapper = await mountChart({ beats: healthyBeats });
    expect(wrapper.find('.rhythm-warning').exists()).toBe(false);
  });
});
