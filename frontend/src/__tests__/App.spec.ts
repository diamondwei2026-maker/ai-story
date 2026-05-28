import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('App', () => {
  const mountApp = async () => {
    const { default: App } = await import('@/App.vue');
    return mount(App, {
      global: {
        stubs: {
          'router-view': { template: '<div data-testid="router-view" />' },
        },
      },
    });
  };

  it('renders without crashing', async () => {
    const wrapper = await mountApp();
    expect(wrapper.exists()).toBe(true);
  });

  it('wraps content in AppLayout', async () => {
    const wrapper = await mountApp();
    expect(wrapper.find('.app-layout').exists()).toBe(true);
  });

  it('contains CanvasBackground for the particle animation', async () => {
    const wrapper = await mountApp();
    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('contains a router-view for page rendering', async () => {
    const wrapper = await mountApp();
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true);
  });
});
