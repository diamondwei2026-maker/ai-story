import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

describe('MarkdownRenderer', () => {
  it('renders nothing when content is empty', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '' },
    });
    expect(wrapper.find('[data-testid="markdown-renderer"]').exists()).toBe(false);
  });

  it('renders plain text as a paragraph', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'Hello world' },
    });
    const html = wrapper.find('[data-testid="markdown-renderer"]');
    expect(html.exists()).toBe(true);
    expect(html.html()).toContain('<p>Hello world</p>');
  });

  it('renders **bold** as <strong>', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'This is **important** text' },
    });
    expect(wrapper.html()).toContain('<strong>important</strong>');
  });

  it('renders ## headers', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '## 章节标题' },
    });
    expect(wrapper.html()).toContain('<h3>章节标题</h3>');
  });

  it('escapes HTML in content', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '<script>alert("xss")</script>' },
    });
    expect(wrapper.html()).not.toContain('<script>');
    expect(wrapper.html()).toContain('&lt;script&gt;');
  });

  it('renders nothing when plain mode is true', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '**bold**', plain: true },
    });
    expect(wrapper.find('[data-testid="markdown-renderer"]').exists()).toBe(false);
  });

  it('applies markdown-renderer class', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'Some text' },
    });
    const el = wrapper.find('[data-testid="markdown-renderer"]');
    expect(el.classes()).toContain('markdown-renderer');
  });
});
