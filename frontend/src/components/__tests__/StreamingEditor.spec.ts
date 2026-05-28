import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('StreamingEditor', () => {
  const mountEditor = async (props: {
    content: string;
    isStreaming: boolean;
    isEditable: boolean;
  }) => {
    const { default: StreamingEditor } = await import(
      '@/components/StreamingEditor.vue'
    );
    return mount(StreamingEditor, { props });
  };

  it('renders the chapter content', async () => {
    const wrapper = await mountEditor({
      content: '夜色如墨，李凡站在城墙之上。',
      isStreaming: false,
      isEditable: false,
    });

    expect(wrapper.text()).toContain('夜色如墨');
    expect(wrapper.text()).toContain('李凡');
  });

  it('shows streaming indicator when isStreaming is true', async () => {
    const wrapper = await mountEditor({
      content: '正在生成...',
      isStreaming: true,
      isEditable: false,
    });

    const indicator = wrapper.find('[data-testid="streaming-indicator"]');
    expect(indicator.exists()).toBe(true);
  });

  it('enables editing when isEditable is true', async () => {
    const wrapper = await mountEditor({
      content: 'Editable content',
      isStreaming: false,
      isEditable: true,
    });

    // Toggle editing on the component vm directly
    (wrapper.vm as any).editing = true;
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    expect(textarea.exists()).toBe(true);
    // <a-textarea> renders a native textarea, data-testid is on the root element
  });

  it('hides textarea when isEditable is false', async () => {
    const wrapper = await mountEditor({
      content: '只读内容',
      isStreaming: false,
      isEditable: false,
    });

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    expect(textarea.exists()).toBe(false);
  });

  it('emits update:content when user edits text', async () => {
    const wrapper = await mountEditor({
      content: 'Original content',
      isStreaming: false,
      isEditable: true,
    });

    // Toggle editing on the component vm directly
    (wrapper.vm as any).editing = true;
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    await textarea.setValue('User edited content');

    expect(wrapper.emitted('update:content')).toBeTruthy();
    expect(wrapper.emitted('update:content')![0]).toEqual(['User edited content']);
  });

  it('applies typewriter cursor class when streaming', async () => {
    const wrapper = await mountEditor({
      content: '正在生成...',
      isStreaming: true,
      isEditable: false,
    });

    const content = wrapper.find('[data-testid="editor-content"]');
    expect(content.classes()).toContain('streaming-editor__content--active');
  });

  it('displays empty state when content is null', async () => {
    const wrapper = await mountEditor({
      content: '',
      isStreaming: false,
      isEditable: false,
    });

    const placeholder = wrapper.find('[data-testid="editor-placeholder"]');
    expect(placeholder.exists()).toBe(true);
  });
});
