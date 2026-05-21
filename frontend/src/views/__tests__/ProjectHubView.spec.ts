import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('ProjectHubView', () => {
  const mountView = async () => {
    const { default: ProjectHubView } = await import('@/views/ProjectHubView.vue');
    return mount(ProjectHubView);
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
