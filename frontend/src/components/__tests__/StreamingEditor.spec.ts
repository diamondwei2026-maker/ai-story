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
      content: '可编辑的内容',
      isStreaming: false,
      isEditable: true,
    });

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes('readonly')).toBeUndefined();
  });

  it('disables editing when isEditable is false', async () => {
    const wrapper = await mountEditor({
      content: '只读内容',
      isStreaming: false,
      isEditable: false,
    });

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    expect(textarea.attributes('readonly')).toBeDefined();
  });

  it('emits update:content when user edits text', async () => {
    const wrapper = await mountEditor({
      content: '原始内容',
      isStreaming: false,
      isEditable: true,
    });

    const textarea = wrapper.find('[data-testid="editor-textarea"]');
    await textarea.setValue('用户修改后的内容');

    expect(wrapper.emitted('update:content')).toBeTruthy();
    expect(wrapper.emitted('update:content')![0]).toEqual(['用户修改后的内容']);
  });

  it('applies typewriter cursor class when streaming', async () => {
    const wrapper = await mountEditor({
      content: '正在生成...',
      isStreaming: true,
      isEditable: false,
    });

    const content = wrapper.find('[data-testid="editor-content"]');
    expect(content.classes()).toContain('typewriter-active');
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
