import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';

describe('AppLayout', () => {
  const mountAppLayout = async () => {
    const { default: AppLayout } = await import('@/components/AppLayout.vue');
    return mount(AppLayout, {
      slots: {
        header: h('div', { class: 'test-header' }, 'Header Content'),
        default: h('div', { class: 'test-main' }, 'Main Content'),
        footer: h('div', { class: 'test-footer' }, 'Footer Content'),
      },
    });
  };

  it('renders the header slot content', async () => {
    const wrapper = await mountAppLayout();

    expect(wrapper.find('.test-header').exists()).toBe(true);
    expect(wrapper.find('.test-header').text()).toBe('Header Content');
  });

  it('renders the default slot content as the main area', async () => {
    const wrapper = await mountAppLayout();

    expect(wrapper.find('.test-main').exists()).toBe(true);
    expect(wrapper.find('.test-main').text()).toBe('Main Content');
  });

  it('renders the footer slot content', async () => {
    const wrapper = await mountAppLayout();

    expect(wrapper.find('.test-footer').exists()).toBe(true);
    expect(wrapper.find('.test-footer').text()).toBe('Footer Content');
  });

  it('has the warm beige background class for the book-like theme', async () => {
    const wrapper = await mountAppLayout();

    expect(wrapper.classes()).toContain('app-layout');
    expect(wrapper.find('.app-layout__body').exists()).toBe(true);
  });

  it('renders without footer when footer slot is not provided', async () => {
    const { default: AppLayout } = await import('@/components/AppLayout.vue');
    const wrapper = mount(AppLayout, {
      slots: {
        default: 'Content',
      },
    });

    expect(wrapper.find('.app-layout__footer').exists()).toBe(false);
  });
});
