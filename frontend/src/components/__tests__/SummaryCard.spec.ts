import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockSummaryData = {
  oneLiner: '现代女医生重生星际时代，以一柄手术刀开创"医能"新体系。',
  fullSummary: `林清音是二十一世纪最年轻的心外科主任医师，却在一次手术中因过劳猝死。
当她再次睁开眼睛，发现自己重生在万年后的星际时代——一个异能者掌控一切的世界。
现代医学知识成为她最大的金手指：她用手术刀精准切割能量回路，用药物学知识改良修炼丹药。`,
};

describe('SummaryCard', () => {
  const mountComponent = async (props?: Record<string, unknown>) => {
    const { default: SummaryCard } = await import('@/components/SummaryCard.vue');
    return mount(SummaryCard, {
      props: {
        oneLiner: mockSummaryData.oneLiner,
        fullSummary: mockSummaryData.fullSummary,
        loading: false,
        ...props,
      },
    });
  };

  it('renders the summary card container', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="summary-card"]').exists()).toBe(true);
  });

  it('displays the one-liner summary', async () => {
    const wrapper = await mountComponent();
    const oneLiner = wrapper.find('[data-testid="one-liner"]');
    expect(oneLiner.exists()).toBe(true);
    expect(oneLiner.text()).toContain('现代女医生重生星际时代');
  });

  it('displays the full 500-word summary', async () => {
    const wrapper = await mountComponent();
    const fullSummary = wrapper.find('[data-testid="full-summary"]');
    expect(fullSummary.exists()).toBe(true);
    expect(fullSummary.text()).toContain('林清音');
  });

  it('shows section labels for one-liner and full summary', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="one-liner-label"]').text()).toBeTruthy();
    expect(wrapper.find('[data-testid="full-summary-label"]').text()).toBeTruthy();
  });

  it('shows loading state when loading prop is true', async () => {
    const wrapper = await mountComponent({
      oneLiner: '',
      fullSummary: '',
      loading: true,
    });

    expect(wrapper.find('[data-testid="summary-loading"]').exists()).toBe(true);
  });

  it('shows empty state when no summary is available', async () => {
    const wrapper = await mountComponent({
      oneLiner: '',
      fullSummary: '',
      loading: false,
    });

    expect(wrapper.find('[data-testid="summary-empty"]').exists()).toBe(true);
  });

  it('renders the custom brief editor when enabled', async () => {
    const wrapper = await mountComponent({ editable: true });

    expect(wrapper.find('[data-testid="custom-brief-input"]').exists()).toBe(true);
  });

  it('emits update:customBrief when custom brief is edited', async () => {
    const wrapper = await mountComponent({ editable: true });

    const input = wrapper.find('[data-testid="custom-brief-input"]');
    await input.setValue('修改后的一句话简介');

    expect(wrapper.emitted('update:customBrief')).toBeTruthy();
  });
});
