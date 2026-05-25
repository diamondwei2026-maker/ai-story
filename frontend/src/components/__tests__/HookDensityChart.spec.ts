import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockBeats = [
  {
    id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
    plan: { conflictPoint: 'A', hookPresets: ['钩子1', '钩子2'] },
    targetWordCount: 3000, hookCount: 2, isClimax: false,
    useR1: true, status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-2', projectId: 'proj-1', chapterNumber: 2,
    plan: { conflictPoint: 'B', hookPresets: ['钩子3'] },
    targetWordCount: 3500, hookCount: 1, isClimax: false,
    useR1: false, status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-3', projectId: 'proj-1', chapterNumber: 3,
    plan: { conflictPoint: 'C', hookPresets: ['钩子4', '钩子5', '钩子6'] },
    targetWordCount: 4000, hookCount: 3, isClimax: true,
    useR1: true, status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-4', projectId: 'proj-1', chapterNumber: 4,
    plan: { conflictPoint: 'D', hookPresets: ['钩子7'] },
    targetWordCount: 3200, hookCount: 1, isClimax: false,
    useR1: false, status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'beat-5', projectId: 'proj-1', chapterNumber: 5,
    plan: { conflictPoint: 'E', hookPresets: ['钩子8', '钩子9'] },
    targetWordCount: 3800, hookCount: 2, isClimax: false,
    useR1: true, status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

describe('HookDensityChart', () => {
  const mountChart = async (props: { beats: typeof mockBeats }) => {
    const { default: HookDensityChart } = await import('@/components/HookDensityChart.vue');
    return mount(HookDensityChart, { props });
  };

  it('renders the chart container', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    expect(wrapper.find('[data-testid="hook-density-chart"]').exists()).toBe(true);
  });

  it('renders one bar per beat', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    const bars = wrapper.findAll('[data-testid="hook-density-bar"]');
    expect(bars).toHaveLength(5);
  });

  it('displays chapter labels on x-axis', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    const labels = wrapper.findAll('[data-testid="hook-density-label"]');
    expect(labels[0].text()).toContain('1');
    expect(labels[4].text()).toContain('5');
  });

  it('highlights bars with hookCount >= 3', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    const highBars = wrapper.findAll('.bar-high');
    expect(highBars).toHaveLength(1); // chapter 3 has hookCount=3
  });

  it('renders thresholds as reference lines', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    expect(wrapper.find('[data-testid="hook-density-threshold"]').exists()).toBe(true);
  });

  it('shows empty state when no beats', async () => {
    const wrapper = await mountChart({ beats: [] });

    expect(wrapper.find('[data-testid="hook-density-empty"]').exists()).toBe(true);
  });

  it('renders y-axis with count scale', async () => {
    const wrapper = await mountChart({ beats: mockBeats });

    expect(wrapper.find('[data-testid="hook-density-yaxis"]').exists()).toBe(true);
  });
});
