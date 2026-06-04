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
    plan: { conflictPoint: "测试冲突点", hookPresets: ["钩子A", "钩子B"] },
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

describe("BeatChapterCard", () => {
  const mountCard = async (props: { beat: Beat; selected?: boolean }) => {
    const { default: BeatChapterCard } = await import("@/components/BeatChapterCard.vue");
    return mount(BeatChapterCard, { props });
  };

  it("renders the card container", async () => {
    const wrapper = await mountCard({ beat: makeBeat() });
    expect(wrapper.find('[data-testid="beat-chapter-card"]').exists()).toBe(true);
  });

  it("displays chapter number", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ chapterNumber: 3 }) });
    expect(wrapper.find('[data-testid="chapter-card-number"]').text()).toContain("3");
  });

  it("displays conflict point", async () => {
    const wrapper = await mountCard({
      beat: makeBeat({ plan: { conflictPoint: "主角觉醒" } }),
    });
    expect(wrapper.find('[data-testid="chapter-card-conflict"]').text()).toContain("主角觉醒");
  });

  it("renders hook presets as tags", async () => {
    const wrapper = await mountCard({
      beat: makeBeat({
        plan: { hookPresets: ["反转", "悬念", "危机"] },
        hookCount: 3,
      }),
    });
    const tags = wrapper.findAll('[data-testid="chapter-card-hook-tag"]');
    expect(tags).toHaveLength(3);
    expect(tags[0].text()).toBe("反转");
  });

  it("shows target word count", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ targetWordCount: 4500 }) });
    expect(wrapper.find('[data-testid="chapter-card-wordcount"]').text()).toContain("4500");
  });

  it("shows hook count label", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ hookCount: 4 }) });
    expect(wrapper.find('[data-testid="chapter-card-hookcount"]').text()).toContain("4");
  });

  it("shows climax badge when isClimax", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ isClimax: true }) });
    expect(wrapper.find('[data-testid="chapter-card-climax-badge"]').exists()).toBe(true);
  });

  it("hides climax badge when not climax", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ isClimax: false }) });
    expect(wrapper.find('[data-testid="chapter-card-climax-badge"]').exists()).toBe(false);
  });

  it("shows R1 badge when useR1", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ useR1: true }) });
    expect(wrapper.find('[data-testid="chapter-card-r1-badge"]').exists()).toBe(true);
  });

  it("shows STALE badge when status is STALE", async () => {
    const wrapper = await mountCard({ beat: makeBeat({ status: "STALE" }) });
    expect(wrapper.find('[data-testid="chapter-card-stale-badge"]').exists()).toBe(true);
  });

  it("applies selected class when selected prop is true", async () => {
    const wrapper = await mountCard({ beat: makeBeat(), selected: true });
    expect(wrapper.find('[data-testid="beat-chapter-card"]').classes()).toContain("beat-chapter-card--selected");
  });

  it("emits select event on click", async () => {
    const beat = makeBeat();
    const wrapper = await mountCard({ beat });
    await wrapper.find('[data-testid="beat-chapter-card"]').trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual([beat]);
  });

  it("truncates long conflict point", async () => {
    const longConflict = "A".repeat(120);
    const wrapper = await mountCard({
      beat: makeBeat({ plan: { conflictPoint: longConflict } }),
    });
    const text = wrapper.find('[data-testid="chapter-card-conflict"]').text();
    expect(text.length).toBeLessThan(120);
    expect(text).toContain("…");
  });

  it("shows pacing label based on hookCount", async () => {
    const fast = await mountCard({ beat: makeBeat({ hookCount: 5 }) });
    expect(fast.find('[data-testid="chapter-card-pacing"]').text()).toContain("快");

    const mid = await mountCard({ beat: makeBeat({ hookCount: 2 }) });
    expect(mid.find('[data-testid="chapter-card-pacing"]').text()).toContain("中");

    const slow = await mountCard({ beat: makeBeat({ hookCount: 0 }) });
    expect(slow.find('[data-testid="chapter-card-pacing"]').text()).toContain("慢");
  });
});
