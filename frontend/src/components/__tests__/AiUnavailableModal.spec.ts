import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('AiUnavailableModal', () => {
  const mountModal = async (props: { visible: boolean; message?: string; retryLabel?: string }) => {
    const { default: AiUnavailableModal } = await import('@/components/AiUnavailableModal.vue');
    return mount(AiUnavailableModal, { props });
  };

  it('应该在 visible=true 时渲染 Modal', async () => {
    const wrapper = await mountModal({ visible: true });

    const modal = wrapper.find('[data-testid="ai-unavailable-modal"]');
    expect(modal.exists()).toBe(true);
    expect(wrapper.text()).toContain('AI 服务暂时不可用');
  });

  it('应该在 visible=false 时隐藏 Modal', async () => {
    const wrapper = await mountModal({ visible: false });

    const modal = wrapper.find('[data-testid="ai-unavailable-modal"]');
    expect(modal.exists()).toBe(true);
    const modalContent = wrapper.find('.ant-modal');
    expect(modalContent.exists()).toBe(true);
    expect(modalContent.attributes('style')).toContain('display: none');
  });

  it('应该默认显示「AI 服务暂时不可用，请稍后重试」', async () => {
    const wrapper = await mountModal({ visible: true });

    expect(wrapper.text()).toContain('AI 服务暂时不可用，请稍后重试');
  });

  it('应该渲染「手动重试」按钮', async () => {
    const wrapper = await mountModal({ visible: true });

    const retryBtn = wrapper.find('[data-testid="retry-button"]');
    expect(retryBtn.exists()).toBe(true);
    expect(retryBtn.text()).toContain('重试');
  });

  it('点击重试按钮应触发 retry 事件', async () => {
    const wrapper = await mountModal({ visible: true });

    await wrapper.find('[data-testid="retry-button"]').trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('点击遮罩层应触发 close 事件', async () => {
    const wrapper = await mountModal({ visible: true });

    await wrapper.find('.ant-modal-close').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('应允许自定义错误消息', async () => {
    const customMsg = '当前所有 AI 模型均不可用，请检查网络后重试';
    const wrapper = await mountModal({ visible: true, message: customMsg });

    expect(wrapper.text()).toContain(customMsg);
  });

  it('应允许自定义重试按钮文案', async () => {
    const wrapper = await mountModal({ visible: true, retryLabel: '重新尝试' });

    const retryBtn = wrapper.find('[data-testid="retry-button"]');
    expect(retryBtn.text()).toContain('重新尝试');
  });
});
