import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

describe('ProjectHubView', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div></div>' } },
      { path: '/project/:id/idea', name: 'workflow.idea', component: { template: '<div></div>' } },
    ],
  });

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const mountView = async () => {
    const { default: ProjectHubView } = await import('@/views/ProjectHubView.vue');
    return mount(ProjectHubView, {
      global: { plugins: [router] },
    });
  };

  it('renders the dashboard title "我的项目"', async () => {
    const wrapper = await mountView();
    expect(wrapper.text()).toContain('我的项目');
  });

  it('renders a project list area', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('[data-testid="project-list"]').exists()).toBe(true);
  });

  it('renders a create-project button', async () => {
    const wrapper = await mountView();
    const btn = wrapper.find('[data-testid="create-project-btn"]');
    expect(btn.exists()).toBe(true);
  });

  it('displays empty state when no projects exist', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('暂无');
  });
});
