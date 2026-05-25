import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('ModeSwitcher', () => {
  const mountSwitcher = async (props: { mode: string }) => {
    const { default: ModeSwitcher } = await import('@/components/ModeSwitcher.vue');
    return mount(ModeSwitcher, { props });
  };

  it('renders three mode options', async () => {
    const wrapper = await mountSwitcher({ mode: 'new-continue' });

    const options = wrapper.findAll('[data-testid="mode-option"]');
    expect(options).toHaveLength(3);
  });

  it('highlights the active mode', async () => {
    const wrapper = await mountSwitcher({ mode: 'paragraph-rewrite' });

    const active = wrapper.find('[data-testid="mode-option"].active');
    expect(active.exists()).toBe(true);
    expect(active.text()).toContain('段落改写');
  });

  it('emits update:mode when a different mode is clicked', async () => {
    const wrapper = await mountSwitcher({ mode: 'new-continue' });

    const options = wrapper.findAll('[data-testid="mode-option"]');
    const rewriteOption = options.find((o) => o.text().includes('段落改写'));
    if (rewriteOption) {
      await rewriteOption.trigger('click');
    }

    expect(wrapper.emitted('update:mode')).toBeTruthy();
    expect(wrapper.emitted('update:mode')![0]).toEqual(['paragraph-rewrite']);
  });

  it('displays labels for all three modes', async () => {
    const wrapper = await mountSwitcher({ mode: 'new-continue' });

    const text = wrapper.text();
    expect(text).toContain('新建续写');
    expect(text).toContain('段落改写');
    expect(text).toContain('文笔升级');
  });
});
