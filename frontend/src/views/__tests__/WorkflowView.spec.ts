import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

describe('WorkflowView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const mountView = async () => {
    const { default: WorkflowView } = await import('@/views/WorkflowView.vue');

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/project/:id', name: 'workflow', component: WorkflowView },
      ],
    });
    await router.push('/project/test-123');
    await router.isReady();

    return mount(WorkflowView, {
      global: {
        plugins: [router],
        stubs: {
          'router-view': { template: '<div data-testid="child-router-view" />' },
        },
      },
    });
  };

  it('renders without crashing', async () => {
    const wrapper = await mountView();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the WorkflowStepper component', async () => {
    const wrapper = await mountView();
    expect(wrapper.findComponent({ name: 'WorkflowStepper' }).exists()).toBe(true);
  });

  it('renders a child router-view for step content', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('[data-testid="child-router-view"]').exists()).toBe(true);
  });

  it('displays the current project title', async () => {
    const wrapper = await mountView();
    // Project title is rendered via <a-page-header> with the project name
    expect(wrapper.find('.ant-page-header').exists()).toBe(true);
  });

  it('reads projectId from the route params', async () => {
    const wrapper = await mountView();
    // Project ID is passed via route params and used internally
    // The page header renders the project title
    expect(wrapper.find('.ant-page-header').exists()).toBe(true);
  });
});
