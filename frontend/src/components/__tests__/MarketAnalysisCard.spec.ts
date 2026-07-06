import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockSellPoint = {
  index: 0,
  title: '星际医妃风华录',
  coreSellPoint: '现代女医生重生星际时代',
  marketScore: 8.5,
  differentiation: '将专业医学知识融入异能战斗',
};

describe('MarketAnalysisCard', () => {
  const mountComponent = async (props?: Record<string, unknown>) => {
    const { default: MarketAnalysisCard } = await import(
      '@/components/MarketAnalysisCard.vue'
    );
    return mount(MarketAnalysisCard, {
      props: {
        sellPoint: mockSellPoint,
        selected: false,
        ...props,
      },
    });
  };

  it('renders the market analysis card container', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="market-analysis-card"]').exists()).toBe(true);
  });

  it('displays the sell point title', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="sellpoint-title"]').text()).toContain(
      '星际医妃风华录',
    );
  });

  it('displays the market match score', async () => {
    const wrapper = await mountComponent();
    const progress = wrapper.find('.ant-progress');
    expect(progress.exists()).toBe(true);
  });

  it('displays differentiation analysis', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="differentiation"]').text()).toContain(
      '将专业医学知识融入异能战斗',
    );
  });

  it('applies selected styling when selected prop is true', async () => {
    const wrapper = await mountComponent({ selected: true });
    expect(
      wrapper.find('[data-testid="market-analysis-card"]').classes(),
    ).toContain('card--selected');
  });

  it('emits select event on click', async () => {
    const wrapper = await mountComponent();

    await wrapper.find('[data-testid="market-analysis-card"]').trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
  });
});
