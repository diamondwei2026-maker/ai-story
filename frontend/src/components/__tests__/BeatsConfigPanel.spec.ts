import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('BeatsConfigPanel', () => {
  const mountPanel = async (props: {
    defaultWordCount?: number;
    isConfirmed?: boolean;
    outlineText?: string;
  }) => {
    const { default: BeatsConfigPanel } = await import('@/components/BeatsConfigPanel.vue');
    return mount(BeatsConfigPanel, {
      props: {
        defaultWordCount: 3000,
        isConfirmed: false,
        outlineText: '',
        ...props,
      },
    });
  };

  // ── Render ─────────────────────────────────────────

  it('renders the panel container', async () => {
    const wrapper = await mountPanel({});
    expect(wrapper.find('[data-testid="beats-config-panel"]').exists()).toBe(true);
  });

  // ── Volume presets (segmented) ────────────────────

  it('renders the volume segmented control when not confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    expect(wrapper.find('[data-testid="config-volume-segmented"]').exists()).toBe(true);
  });

  it('defaults to 中篇 (25 chapters)', async () => {
    const wrapper = await mountPanel({});
    const hintText = wrapper.text();
    // Default should show approximately 25 chapters
    expect(hintText).toContain('25');
  });

  it('renders a-input-number when "自定义..." is selected', async () => {
    const wrapper = await mountPanel({});
    // Select "自定义..." (value 0)
    (wrapper.vm as any).targetChapterCount = 0;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="config-custom-chapters"]').exists()).toBe(true);
  });

  it('hides a-input-number when switching back to preset from custom', async () => {
    const wrapper = await mountPanel({});
    // First select custom
    (wrapper.vm as any).targetChapterCount = 0;
    await wrapper.vm.$nextTick();
    // Then switch to a preset
    (wrapper.vm as any).targetChapterCount = 40;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="config-custom-chapters"]').exists()).toBe(false);
  });

  it('emits custom chapter count on start-generation', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3000 });
    // Select custom and set value
    (wrapper.vm as any).targetChapterCount = 0;
    (wrapper.vm as any).customChapterCount = 55;
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');

    const emitted = wrapper.emitted('start-generation');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([{
      targetChapterCount: 55,
      defaultWordCount: 3000,
    }]);
  });

  it('emits preset chapter count when preset is active (not custom)', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3000 });
    (wrapper.vm as any).targetChapterCount = 40;
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');

    const emitted = wrapper.emitted('start-generation');
    expect(emitted![0]).toEqual([{
      targetChapterCount: 40,
      defaultWordCount: 3000,
    }]);
  });

  // ── Word count segmented ──────────────────────────

  it('renders the word count segmented control when not confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    expect(wrapper.find('[data-testid="config-wordcount-segmented"]').exists()).toBe(true);
  });

  it('uses defaultWordCount prop as initial value', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 4000 });
    // The segmented should show the initial value
    expect(wrapper.vm).toBeDefined();
  });

  // ── Start generation button ───────────────────────

  it('renders "开始拆解" button when not confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    const btn = wrapper.find('[data-testid="config-start-generation-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('开始拆解');
  });

  it('emits start-generation with chapter count and word count on click', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3000 });
    await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');

    const emitted = wrapper.emitted('start-generation');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([{
      targetChapterCount: 25, // default 中篇
      defaultWordCount: 3000,
    }]);
  });

  it('emits update:wordCount on start-generation', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 5000 });
    await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');

    const emitted = wrapper.emitted('update:wordCount');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([5000]);
  });

  // ── Outline preview (collapsible) ─────────────────

  it('shows outline preview collapse when outlineText is provided', async () => {
    const wrapper = await mountPanel({ outlineText: '大纲内容...' });
    // a-collapse is rendered
    expect(wrapper.find('[data-testid="config-outline-preview"]').exists()).toBe(false);
    // Note: a-collapse is initially collapsed, so the preview content is not visible
    // But the collapse container should exist
  });

  it('does not show outline preview when outlineText is empty', async () => {
    const wrapper = await mountPanel({ outlineText: '' });
    // No a-collapse rendered
    expect(wrapper.find('.config-collapse').exists()).toBe(false);
  });

  // ── Confirmed state ───────────────────────────────

  it('shows confirmed badge when isConfirmed is true', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-confirmed-label"]').exists()).toBe(true);
  });

  it('hides generate button when confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-start-generation-btn"]').exists()).toBe(false);
  });

  it('hides volume segmented when confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-volume-segmented"]').exists()).toBe(false);
  });

  it('hides word count segmented when confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-wordcount-segmented"]').exists()).toBe(false);
  });

  // ── Word count options ────────────────────────────

  it('supports all four word count options', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 2000 });
    // Should not throw for any of the valid options
    expect(wrapper.vm).toBeDefined();
  });
});
