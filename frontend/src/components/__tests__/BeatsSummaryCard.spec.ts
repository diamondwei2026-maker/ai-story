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
  makeBeat({ id: "b1", chapterNumber: 1, targetWordCount: 3000, hookCount: 2, useR1: true }),
  makeBeat({ id: "b2", chapterNumber: 2, targetWordCount: 3500, hookCount: 1, useR1: false }),
  makeBeat({ id: "b3", chapterNumber: 3, targetWordCount: 4000, hookCount: 4, isClimax: true, useR1: true }),
  makeBeat({ id: "b4", chapterNumber: 4, targetWordCount: 3200, hookCount: 2, useR1: false }),
  makeBeat({ id: "b5", chapterNumber: 5, targetWordCount: 3800, hookCount: 3, useR1: true }),
];

describe("BeatsSummaryCard", () => {
  const mountCard = async (props: { beats: Beat[] }) => {
    const { default: BeatsSummaryCard } = await import("@/components/BeatsSummaryCard.vue");
    return mount(BeatsSummaryCard, { props });
  };

  it("renders the card container", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="beats-summary-card"]').exists()).toBe(true);
  });

  it("displays total chapter count", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-total-chapters"]').text()).toContain("5");
  });

  it("displays total word count", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-total-words"]').text()).toContain("17500");
  });

  it("displays R1 chapter count", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-r1-count"]').text()).toContain("3");
  });

  it("displays climax chapter count", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-climax-count"]').text()).toContain("1");
  });

  it("displays average hook density", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-avg-hooks"]').text()).toContain("2.4");
  });

  it("displays STALE count when some beats are STALE", async () => {
    const beatsWithStale = [
      ...mockBeats.slice(0, 3),
      makeBeat({ id: "b4", chapterNumber: 4, status: "STALE" }),
      makeBeat({ id: "b5", chapterNumber: 5, status: "STALE" }),
    ];
    const wrapper = await mountCard({ beats: beatsWithStale });
    expect(wrapper.find('[data-testid="summary-stale-count"]').text()).toContain("2");
  });

  it("shows zero STALE when all beats are confirmed", async () => {
    const wrapper = await mountCard({ beats: mockBeats });
    expect(wrapper.find('[data-testid="summary-stale-count"]').text()).toContain("0");
  });

  it("renders empty state when no beats", async () => {
    const wrapper = await mountCard({ beats: [] });
    expect(wrapper.find('[data-testid="summary-empty"]').exists()).toBe(true);
  });
});
