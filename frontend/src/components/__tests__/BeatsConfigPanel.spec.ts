import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('BeatsConfigPanel', () => {
  const mountPanel = async (props: {
    defaultWordCount?: number;
    isConfirmed?: boolean;
  }) => {
    const { default: BeatsConfigPanel } = await import('@/components/BeatsConfigPanel.vue');
    return mount(BeatsConfigPanel, {
      props: {
        defaultWordCount: 3000,
        isConfirmed: false,
        ...props,
      },
    });
  };

  // ── Render ─────────────────────────────────────────

  it('renders the panel container', async () => {
    const wrapper = await mountPanel({});
    expect(wrapper.find('[data-testid="beats-config-panel"]').exists()).toBe(true);
  });

  // ── Inputs ─────────────────────────────────────────

  it('renders chapter count input', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    expect(wrapper.find('[data-testid="config-chapter-input"]').exists()).toBe(true);
  });

  it('renders word count input', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    expect(wrapper.find('[data-testid="config-wordcount-input"]').exists()).toBe(true);
  });

  // ── Start generation button ───────────────────────

  it('renders "开始拆解" button when not confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: false });
    const btn = wrapper.find('[data-testid="config-start-generation-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('开始拆解');
  });

  it('emits start-generation with default chapter count (25) and word count on click', async () => {
    const wrapper = await mountPanel({ defaultWordCount: 3000 });
    await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');

    const emitted = wrapper.emitted('start-generation');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([{
      targetChapterCount: 25,
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

  // ── Confirmed state ───────────────────────────────

  it('shows confirmed badge when isConfirmed is true', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-confirmed-label"]').exists()).toBe(true);
  });

  it('hides generate button when confirmed', async () => {
    const wrapper = await mountPanel({ isConfirmed: true });
    expect(wrapper.find('[data-testid="config-start-generation-btn"]').exists()).toBe(false);
  });
});
