import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('ModelBadge', () => {
  const mountBadge = async (props: { modelName: string; degraded: boolean }) => {
    const { default: ModelBadge } = await import('@/components/ModelBadge.vue');
    return mount(ModelBadge, { props });
  };

  it('displays the current model name', async () => {
    const wrapper = await mountBadge({ modelName: 'DeepSeek-V3', degraded: false });

    expect(wrapper.text()).toContain('DeepSeek-V3');
  });

  it('shows a regular badge when not degraded', async () => {
    const wrapper = await mountBadge({ modelName: 'DeepSeek-V3', degraded: false });

    const badge = wrapper.find('[data-testid="model-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.classes()).not.toContain('badge--degraded');
  });

  it('shows a yellow warning badge when degraded', async () => {
    const wrapper = await mountBadge({ modelName: 'DeepSeek-R1', degraded: true });

    const badge = wrapper.find('[data-testid="model-badge"]');
    expect(badge.classes()).toContain('badge--degraded');
  });

  it('displays "已降级至" text when degraded', async () => {
    const wrapper = await mountBadge({ modelName: 'DeepSeek-R1', degraded: true });

    expect(wrapper.text()).toContain('已降级至');
  });

  it('displays the fallback model name when degraded', async () => {
    const wrapper = await mountBadge({ modelName: 'DeepSeek-R1', degraded: true });

    expect(wrapper.text()).toContain('DeepSeek-R1');
  });
});
