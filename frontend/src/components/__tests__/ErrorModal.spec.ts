import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('ErrorModal', () => {
  const mountModal = async (props: { visible: boolean; message?: string; retryLabel?: string }) => {
    const { default: ErrorModal } = await import('@/components/ErrorModal.vue');
    return mount(ErrorModal, { props });
  };

  it('is visible when the visible prop is true', async () => {
    const wrapper = await mountModal({ visible: true, message: 'AI 服务暂时不可用，请稍后重试。' });

    const modal = wrapper.find('[data-testid="error-modal"]');
    expect(modal.exists()).toBe(true);
    expect(wrapper.text()).toContain('AI 服务暂时不可用');
  });

  it('is hidden when the visible prop is false', async () => {
    const wrapper = await mountModal({ visible: false });

    const modal = wrapper.find('[data-testid="error-modal"]');
    expect(modal.exists()).toBe(true);
    // antd modal renders content even when closed, but the wrapper is display:none
    const modalContent = wrapper.find('.ant-modal');
    expect(modalContent.exists()).toBe(true);
    expect(modalContent.attributes('style')).toContain('display: none');
  });

  it('displays the provided error message', async () => {
    const message = 'AI 服务暂时不可用，请稍后重试。';
    const wrapper = await mountModal({ visible: true, message });

    expect(wrapper.text()).toContain(message);
  });

  it('displays a default message when none is provided', async () => {
    const wrapper = await mountModal({ visible: true });

    expect(wrapper.text()).toContain('AI 服务暂时不可用');
  });

  it('renders a "Retry" button', async () => {
    const wrapper = await mountModal({ visible: true });

    const retryBtn = wrapper.find('[data-testid="retry-button"]');
    expect(retryBtn.exists()).toBe(true);
    expect(retryBtn.text()).toContain('重试');
  });

  it('uses custom retry label when provided', async () => {
    const wrapper = await mountModal({ visible: true, retryLabel: '重新尝试' });

    const retryBtn = wrapper.find('[data-testid="retry-button"]');
    expect(retryBtn.text()).toContain('重新尝试');
  });

  it('emits retry event when the retry button is clicked', async () => {
    const wrapper = await mountModal({ visible: true });

    await wrapper.find('[data-testid="retry-button"]').trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('emits close event when the modal is dismissed', async () => {
    const wrapper = await mountModal({ visible: true });

    await wrapper.find('.ant-modal-close').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
