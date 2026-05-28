import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('AppealModal', () => {
  const mountModal = async (props: {
    visible: boolean;
    chapterTitle?: string;
    originalVerdict?: string;
  }) => {
    const { default: AppealModal } = await import(
      '@/components/AppealModal.vue'
    );
    return mount(AppealModal, { props });
  };

  describe('visibility', () => {
    it('renders when visible is true', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(wrapper.find('[data-testid="appeal-modal-backdrop"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('审核上诉');
    });

    it('does not render modal content when visible is false', async () => {
      const wrapper = await mountModal({ visible: false });

      expect(wrapper.find('[data-testid="appeal-modal-backdrop"]').exists()).toBe(true);
      const modalContent = wrapper.find('.ant-modal');
      expect(modalContent.exists()).toBe(true);
      expect(modalContent.attributes('style')).toContain('display: none');
    });
  });

  describe('content', () => {
    it('renders a text area for entering appeal reason', async () => {
      const wrapper = await mountModal({ visible: true });

      const textarea = wrapper.find('[data-testid="appeal-reason-input"]');
      expect(textarea.exists()).toBe(true);
    });

    it('accepts user text input in the reason field', async () => {
      const wrapper = await mountModal({ visible: true });

      const textarea = wrapper.find('[data-testid="appeal-reason-input"]');
      await textarea.setValue('我认为审核标注存在误解');

      expect((textarea.element as HTMLTextAreaElement).value).toBe(
        '我认为审核标注存在误解',
      );
    });

    it('shows the original verdict being appealed', async () => {
      const wrapper = await mountModal({
        visible: true,
        originalVerdict: 'NEEDS_REVISION',
      });

      expect(wrapper.text()).toContain('NEEDS_REVISION');
    });

    it('shows the chapter title if provided', async () => {
      const wrapper = await mountModal({
        visible: true,
        chapterTitle: '第一章·觉醒',
      });

      expect(wrapper.text()).toContain('第一章·觉醒');
    });

    it('shows notice that appeal is only available once', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(wrapper.find('[data-testid="appeal-once-notice"]').exists()).toBe(
        true,
      );
      expect(wrapper.text()).toMatch(/仅.*一次/);
    });
  });

  describe('buttons', () => {
    it('renders a "Submit appeal" button', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(
        wrapper.find('[data-testid="appeal-submit-btn"]').exists(),
      ).toBe(true);
    });

    it('renders a "Cancel" button', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(
        wrapper.find('[data-testid="appeal-cancel-btn"]').exists(),
      ).toBe(true);
    });

    it('disables submit when reason is empty', async () => {
      const wrapper = await mountModal({ visible: true });

      const submitBtn = wrapper.find('[data-testid="appeal-submit-btn"]');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('enables submit when reason is non-empty', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper
        .find('[data-testid="appeal-reason-input"]')
        .setValue('我有异议');

      const submitBtn = wrapper.find('[data-testid="appeal-submit-btn"]');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('events', () => {
    it('emits "submit" with the appeal reason when submit clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper
        .find('[data-testid="appeal-reason-input"]')
        .setValue('角色冲突系情节需要，非政治隐喻');
      await wrapper.find('[data-testid="appeal-submit-btn"]').trigger('click');

      expect(wrapper.emitted('submit')).toBeTruthy();
      expect(wrapper.emitted('submit')![0]).toEqual([
        '角色冲突系情节需要，非政治隐喻',
      ]);
    });

    it('emits "cancel" when cancel button clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('[data-testid="appeal-cancel-btn"]').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('emits "cancel" when modal backdrop clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('.ant-modal-close').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('clears reason input after successful submit', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper
        .find('[data-testid="appeal-reason-input"]')
        .setValue('测试上诉理由');
      await wrapper.find('[data-testid="appeal-submit-btn"]').trigger('click');

      const textarea = wrapper.find('[data-testid="appeal-reason-input"]');
      expect((textarea.element as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('loading state', () => {
    it('disables submit button while submitting', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper
        .find('[data-testid="appeal-reason-input"]')
        .setValue('测试理由');

      const submitBtn = wrapper.find('[data-testid="appeal-submit-btn"]');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(false);
    });

    it('shows loading state on submit button during submission', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper
        .find('[data-testid="appeal-reason-input"]')
        .setValue('测试');

      expect(
        wrapper.find('[data-testid="appeal-submitting-indicator"]').exists(),
      ).toBe(false);
    });
  });
});
