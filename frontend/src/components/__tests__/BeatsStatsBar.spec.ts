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

const mockBeats: BeatV2[] = [
  makeBeat({ id: 'b1', chapterNumber: 1, targetWordCount: 3000, pacingLabel: '快' }),
  makeBeat({ id: 'b2', chapterNumber: 2, targetWordCount: 3500, pacingLabel: '中', isClimax: true }),
  makeBeat({ id: 'b3', chapterNumber: 3, targetWordCount: 4000, pacingLabel: '快' }),
  makeBeat({ id: 'b4', chapterNumber: 4, targetWordCount: 3200, pacingLabel: '快' }),
  makeBeat({ id: 'b5', chapterNumber: 5, targetWordCount: 3800, pacingLabel: '慢', isClimax: true }),
];

describe('BeatsStatsBar', () => {
  const mountBar = async (props: { beats: BeatV2[] }) => {
    const { default: BeatsStatsBar } = await import('@/components/BeatsStatsBar.vue');
    return mount(BeatsStatsBar, { props });
  };

  it('renders the stats bar container', async () => {
    const wrapper = await mountBar({ beats: mockBeats });
    expect(wrapper.find('[data-testid="beats-stats-bar"]').exists()).toBe(true);
  });

  it('displays total chapter count', async () => {
    const wrapper = await mountBar({ beats: mockBeats });
    expect(wrapper.find('[data-testid="stats-total-chapters"]').text()).toBe('5');
  });

  it('displays total word count (formatted as 万 when >= 10000)', async () => {
    const wrapper = await mountBar({ beats: mockBeats });
    // 3000+3500+4000+3200+3800 = 17500 -> formatted as 1.8万
    expect(wrapper.find('[data-testid="stats-total-words"]').text()).toContain('1.8万');
  });

  it('displays climax chapter count', async () => {
    const wrapper = await mountBar({ beats: mockBeats });
    expect(wrapper.find('[data-testid="stats-climax-count"]').text()).toBe('2');
  });

  it('displays dominant pacing label', async () => {
    const wrapper = await mountBar({ beats: mockBeats });
    expect(wrapper.find('[data-testid="stats-dominant-pacing"]').text()).toBe('快');
  });

  it('shows 暂无 when no beats', async () => {
    const wrapper = await mountBar({ beats: [] });
    expect(wrapper.find('[data-testid="stats-dominant-pacing"]').text()).toBe('暂无');
  });

  it('shows zeros when empty', async () => {
    const wrapper = await mountBar({ beats: [] });
    expect(wrapper.find('[data-testid="stats-total-chapters"]').text()).toBe('0');
    expect(wrapper.find('[data-testid="stats-total-words"]').text()).toBe('0');
    expect(wrapper.find('[data-testid="stats-climax-count"]').text()).toBe('0');
  });
});
