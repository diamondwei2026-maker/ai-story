import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mockSellPoints = [
  {
    index: 0,
    title: '星际医妃风华录',
    coreSellPoint: '现代女医生重生星际时代',
    marketScore: 8.5,
    differentiation: '将专业医学知识融入异能战斗',
  },
  {
    index: 1,
    title: '毒妃逆袭：星际制药女王',
    coreSellPoint: '毒理学博士穿越成废材王妃',
    marketScore: 7.8,
    differentiation: '商战+修炼双线并行',
  },
  {
    index: 2,
    title: '星海巡诊：医妃的宇宙诊所',
    coreSellPoint: '绑定宇宙诊所系统穿越不同星球行医',
    marketScore: 9.2,
    differentiation: '单元剧+长线主线',
  },
];

describe('SellPointSelector', () => {
  const mountComponent = async (props?: Record<string, unknown>) => {
    const { default: SellPointSelector } = await import(
      '@/components/SellPointSelector.vue'
    );
    return mount(SellPointSelector, {
      props: {
        sellPoints: mockSellPoints,
        selectedIndex: -1,
        loading: false,
        ...props,
      },
    });
  };

  it('renders the sell point selector container', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="sellpoint-selector"]').exists()).toBe(true);
  });

  it('renders a MarketAnalysisCard for each sell point', async () => {
    const wrapper = await mountComponent();
    const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
    expect(cards).toHaveLength(3);
  });

  it('shows the section title', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="sellpoint-section-title"]').text()).toBeTruthy();
  });

  it('emits select event when a sell point card is clicked', async () => {
    const wrapper = await mountComponent();

    const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
    await cards[0].trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual([0]);
  });

  it('passes selected=true to the selected card', async () => {
    const wrapper = await mountComponent({ selectedIndex: 1 });

    const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
    // The second card should have selected class
    expect(cards[1].classes()).toContain('card--selected');
  });

  it('shows feedback textarea for unsatisfied user to input feedback', async () => {
    const wrapper = await mountComponent();

    const feedbackInput = wrapper.find('[data-testid="feedback-input"]');
    expect(feedbackInput.exists()).toBe(true);
  });

  it('shows regenerate button alongside feedback input', async () => {
    const wrapper = await mountComponent();

    expect(wrapper.find('[data-testid="regenerate-sellpoints-btn"]').exists()).toBe(true);
  });

  it('emits regenerate event with feedback text when regenerate button is clicked', async () => {
    const wrapper = await mountComponent();

    const feedbackInput = wrapper.find('[data-testid="feedback-input"]');
    await feedbackInput.setValue('希望更偏向轻松搞笑风格');

    await wrapper.find('[data-testid="regenerate-sellpoints-btn"]').trigger('click');

    expect(wrapper.emitted('regenerate')).toBeTruthy();
    expect(wrapper.emitted('regenerate')![0]).toEqual([
      '希望更偏向轻松搞笑风格',
    ]);
  });

  it('disables regenerate button when loading is true', async () => {
    const wrapper = await mountComponent({ loading: true });

    const btn = wrapper.find('[data-testid="regenerate-sellpoints-btn"]');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('shows loading indicator when loading prop is true', async () => {
    const wrapper = await mountComponent({ loading: true });

    expect(wrapper.find('[data-testid="sellpoint-loading"]').exists()).toBe(true);
  });

  it('shows generate summary button when a sell point is selected', async () => {
    const wrapper = await mountComponent({ selectedIndex: 0 });

    expect(wrapper.find('[data-testid="generate-summary-btn"]').exists()).toBe(true);
  });

  it('emits generate-summary event when summary button is clicked', async () => {
    const wrapper = await mountComponent({ selectedIndex: 0 });

    await wrapper.find('[data-testid="generate-summary-btn"]').trigger('click');

    expect(wrapper.emitted('generate-summary')).toBeTruthy();
    expect(wrapper.emitted('generate-summary')![0]).toEqual([0]);
  });
});
