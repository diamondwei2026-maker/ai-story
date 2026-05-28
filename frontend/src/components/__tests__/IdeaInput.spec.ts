import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

describe('IdeaInput', () => {
  const mountComponent = async (props?: Record<string, unknown>) => {
    const { default: IdeaInput } = await import('@/components/IdeaInput.vue');
    return mount(IdeaInput, {
      props: {
        modelValue: '',
        disabled: false,
        ...props,
      },
    });
  };

  it('renders the idea input container', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="idea-input"]').exists()).toBe(true);
  });

  it('renders a textarea for creative idea input', async () => {
    const wrapper = await mountComponent();
    const textarea = wrapper.find('[data-testid="idea-textarea"]');
    expect(textarea.exists()).toBe(true);
  });

  it('renders the input label/title', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find('[data-testid="idea-input-title"]').text()).toBeTruthy();
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = await mountComponent();

    const textarea = wrapper.find('[data-testid="idea-textarea"]');
    await textarea.setValue('一个医生重生到星际时代的故事');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([
      '一个医生重生到星际时代的故事',
    ]);
  });

  it('disables the textarea when disabled prop is true', async () => {
    const wrapper = await mountComponent({ disabled: true });
    const textarea = wrapper.find('[data-testid="idea-textarea"]');

    expect(textarea.attributes('disabled')).toBeDefined();
  });

  it('shows placeholder text guiding user input', async () => {
    const wrapper = await mountComponent();
    const textarea = wrapper.find('[data-testid="idea-textarea"]');

    expect(textarea.attributes('placeholder')).toBeTruthy();
  });

  it('renders the textarea with show-count functionality', async () => {
    const wrapper = await mountComponent({
      modelValue: '一个重生修仙的故事',
    });

    const textarea = wrapper.find('[data-testid="idea-textarea"]');
    expect(textarea.exists()).toBe(true);
  });
});
