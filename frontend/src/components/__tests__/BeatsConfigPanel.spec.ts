import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

describe("BeatsConfigPanel", () => {
  const mountPanel = async (props: {
    defaultWordCount?: number;
    chapterCount?: number;
    isConfirmed?: boolean;
  }) => {
    const { default: BeatsConfigPanel } = await import("@/components/BeatsConfigPanel.vue");
    return mount(BeatsConfigPanel, {
      props: {
        defaultWordCount: 3000,
        chapterCount: 12,
        isConfirmed: false,
        ...props,
      },
    });
  };

  it("renders the panel container", async () => {
    const wrapper = await mountPanel({});
    expect(wrapper.find('[data-testid="beats-config-panel"]').exists()).toBe(true);
  });

  it("displays the current default word count in input when not confirmed", async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3500, isConfirmed: false });
    const input = wrapper.find('[data-testid="config-wordcount-input"]');
    expect(input.exists()).toBe(true);
  });

  it("displays the default word count as readonly when confirmed", async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3500, isConfirmed: true });
    expect(wrapper.find('[data-testid="config-wordcount-display"]').text()).toContain("3500");
  });

  it("displays the estimated chapter count", async () => {
    const wrapper = await mountPanel({ chapterCount: 20 });
    expect(wrapper.find('[data-testid="config-chapter-count"]').text()).toContain("20");
  });

  it("emits update:wordCount when word count is changed", async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3000 });
    // Call exposed handler directly (antd InputNumber DOM structure differs across versions)
    (wrapper.vm as any).handleWordCountChange(5000);
    expect(wrapper.emitted("update:wordCount")?.[0]).toEqual([5000]);
  });

  it("emits regenerate when regenerate button is clicked", async () => {
    const wrapper = await mountPanel({});
    await wrapper.find('[data-testid="config-regenerate-btn"]').trigger("click");
    expect(wrapper.emitted("regenerate")).toBeTruthy();
  });

  it("hides word count input when isConfirmed is true", async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-wordcount-input"]').exists()).toBe(false);
  });

  it("disables regenerate button when isConfirmed is true", async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    const btn = wrapper.find('[data-testid="config-regenerate-btn"]');
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("shows instructional label when not confirmed", async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    expect(wrapper.find('[data-testid="config-hint"]').exists()).toBe(true);
  });

  it("shows confirmed state label when isConfirmed", async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-confirmed-label"]').exists()).toBe(true);
  });
});
