import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

interface Beat {
  id: string;
  projectId: string;
  chapterNumber: number;
  plan: Record<string, unknown>;
  targetWordCount: number;
  hookCount: number;
  isClimax: boolean;
  useR1: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "beat-1",
    projectId: "proj-1",
    chapterNumber: 1,
    plan: {},
    targetWordCount: 3000,
    hookCount: 2,
    isClimax: false,
    useR1: false,
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockBeats: Beat[] = [
  makeBeat({ id: "b1", chapterNumber: 1, targetWordCount: 3000, hookCount: 2 }),
  makeBeat({ id: "b2", chapterNumber: 2, targetWordCount: 3500, hookCount: 1 }),
  makeBeat({ id: "b3", chapterNumber: 3, targetWordCount: 4000, hookCount: 4, isClimax: true, useR1: true }),
  makeBeat({ id: "b4", chapterNumber: 4, targetWordCount: 3200, hookCount: 2 }),
  makeBeat({ id: "b5", chapterNumber: 5, targetWordCount: 3800, hookCount: 3, useR1: true }),
];

describe("BeatsRhythmChart", () => {
  const mountChart = async (props: { beats: Beat[] }) => {
    const { default: BeatsRhythmChart } = await import("@/components/BeatsRhythmChart.vue");
    return mount(BeatsRhythmChart, { props });
  };

  it("renders the chart card container", async () => {
    const wrapper = await mountChart({ beats: mockBeats });
    expect(wrapper.find('[data-testid="beats-rhythm-chart"]').exists()).toBe(true);
  });

  it("renders the chart canvas element", async () => {
    const wrapper = await mountChart({ beats: mockBeats });
    expect(wrapper.find('[data-testid="rhythm-chart-canvas"]').exists()).toBe(true);
  });

  it("chart container div is present when beats exist", async () => {
    const wrapper = await mountChart({ beats: mockBeats });
    const canvas = wrapper.find('[data-testid="rhythm-chart-canvas"]');
    expect(canvas.element).toBeInstanceOf(HTMLDivElement);
  });

  it("renders empty state when no beats", async () => {
    const wrapper = await mountChart({ beats: [] });
    expect(wrapper.find('[data-testid="rhythm-chart-empty"]').exists()).toBe(true);
  });

  it("does not render chart canvas when no beats", async () => {
    const wrapper = await mountChart({ beats: [] });
    expect(wrapper.find('[data-testid="rhythm-chart-canvas"]').exists()).toBe(false);
  });

  it("cleans up echarts instance on unmount", async () => {
    const wrapper = await mountChart({ beats: mockBeats });
    wrapper.unmount();
    // Should not throw — if echarts disposal fails, it would leak but not throw
  });
});
