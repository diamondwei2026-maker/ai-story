import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockBeats = [
  {
    id: 'beat-1',
    projectId: 'proj-1',
    chapterNumber: 1,
    plan: { conflictPoint: '冲突点A', hookPresets: ['钩子1', '钩子2'] },
    targetWordCount: 3000,
    hookCount: 2,
    isClimax: false,
    useR1: true,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-2',
    projectId: 'proj-1',
    chapterNumber: 2,
    plan: { conflictPoint: '冲突点B', hookPresets: ['钩子3'] },
    targetWordCount: 3500,
    hookCount: 1,
    isClimax: false,
    useR1: false,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-3',
    projectId: 'proj-1',
    chapterNumber: 3,
    plan: { conflictPoint: '冲突点C', hookPresets: ['钩子4', '钩子5', '钩子6'] },
    targetWordCount: 4000,
    hookCount: 3,
    isClimax: true,
    useR1: true,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('BeatList', () => {
  const mountList = async (props: { beats: typeof mockBeats }) => {
    const { default: BeatList } = await import('@/components/BeatList.vue');
    return mount(BeatList, { props });
  };

  it('renders the beat list container', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    expect(wrapper.find('[data-testid="beat-list"]').exists()).toBe(true);
  });

  it('renders one row per beat', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const rows = wrapper.findAll('[data-testid="beat-row"]');
    expect(rows).toHaveLength(3);
  });

  it('displays chapter number for each beat', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const rows = wrapper.findAll('[data-testid="beat-row"]');
    expect(rows[0].text()).toContain('1');
    expect(rows[1].text()).toContain('2');
    expect(rows[2].text()).toContain('3');
  });

  it('displays hookCount for each beat', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const hookBadges = wrapper.findAll('[data-testid="beat-hook-count"]');
    expect(hookBadges).toHaveLength(3);
    expect(hookBadges[0].text()).toContain('2');
  });

  it('shows R1 badge for beats with useR1=true', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const r1Badges = wrapper.findAll('[data-testid="beat-r1-badge"]');
    expect(r1Badges).toHaveLength(2); // beat-1 and beat-3
  });

  it('shows climax badge for beats with isClimax=true', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const climaxBadges = wrapper.findAll('[data-testid="beat-climax-badge"]');
    expect(climaxBadges).toHaveLength(1); // beat-3
  });

  it('shows STALE badge for beats with status=STALE', async () => {
    const staleBeats = [
      { ...mockBeats[0], status: 'STALE' as const },
      ...mockBeats.slice(1),
    ];
    const wrapper = await mountList({ beats: staleBeats });

    const staleBadges = wrapper.findAll('[data-testid="beat-stale-badge"]');
    expect(staleBadges).toHaveLength(1);
  });

  it('shows target word count for each beat', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    const wordCounts = wrapper.findAll('[data-testid="beat-word-count"]');
    expect(wordCounts[0].text()).toContain('3000');
    expect(wordCounts[1].text()).toContain('3500');
  });

  it('renders empty state when no beats', async () => {
    const wrapper = await mountList({ beats: [] });

    expect(wrapper.find('[data-testid="beat-list-empty"]').exists()).toBe(true);
  });

  it('emits select event when a beat row is clicked', async () => {
    const wrapper = await mountList({ beats: mockBeats });

    await wrapper.findAll('[data-testid="beat-row"]')[0].trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual([mockBeats[0]]);
  });
});
