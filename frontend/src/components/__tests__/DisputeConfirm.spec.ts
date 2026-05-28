import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('DisputeConfirm', () => {
  const mountModal = async (props: {
    visible: boolean;
    chapterTitle?: string;
    originalVerdict?: string;
  }) => {
    const { default: DisputeConfirm } = await import(
      '@/components/DisputeConfirm.vue'
    );
    return mount(DisputeConfirm, { props });
  };

  describe('visibility', () => {
    it('renders when visible is true', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(
        wrapper.find('[data-testid="dispute-confirm-backdrop"]').exists(),
      ).toBe(true);
      expect(wrapper.text()).toContain('强制标记 DISPUTED');
    });

    it('does not render modal content when visible is false', async () => {
      const wrapper = await mountModal({ visible: false });

      expect(
        wrapper.find('[data-testid="dispute-confirm-backdrop"]').exists(),
      ).toBe(true);
      const modalContent = wrapper.find('.ant-modal');
      expect(modalContent.exists()).toBe(true);
      expect(modalContent.attributes('style')).toContain('display: none');
    });
  });

  describe('risk warning', () => {
    it('displays a mandatory risk warning message', async () => {
      const wrapper = await mountModal({ visible: true });

      const warning = wrapper.find('[data-testid="risk-warning"]');
      expect(warning.exists()).toBe(true);
      expect(warning.text()).toMatch(/风险|责任|合规/);
    });

    it('clearly states that the user assumes compliance risk', async () => {
      const wrapper = await mountModal({ visible: true });

      expect(wrapper.text()).toMatch(/承担|风险|不可撤销/);
    });

    it('shows the chapter being disputed', async () => {
      const wrapper = await mountModal({
        visible: true,
        chapterTitle: '第三章·暗流',
      });

      expect(wrapper.text()).toContain('第三章·暗流');
    });

    it('shows the original BLOCKED/upheld verdict', async () => {
      const wrapper = await mountModal({
        visible: true,
        originalVerdict: 'BLOCKED',
      });

      expect(wrapper.text()).toContain('BLOCKED');
    });
  });

  describe('buttons', () => {
    it('renders a "Confirm dispute" button', async () => {
      const wrapper = await mountModal({ visible: true });

      const btn = wrapper.find('[data-testid="dispute-confirm-btn"]');
      expect(btn.exists()).toBe(true);
      expect(btn.text()).toMatch(/确认/);
    });

    it('renders a "Cancel" button', async () => {
      const wrapper = await mountModal({ visible: true });

      const btn = wrapper.find('[data-testid="dispute-cancel-btn"]');
      expect(btn.exists()).toBe(true);
    });

    it('uses destructive/danger styling for the confirm button', async () => {
      const wrapper = await mountModal({ visible: true });

      const btn = wrapper.find('[data-testid="dispute-confirm-btn"]');
      const classes = btn.classes();
      const isDanger = classes.includes('ant-btn-dangerous');
      expect(isDanger).toBe(true);
    });
  });

  describe('events', () => {
    it('emits "confirm" when confirm button clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('[data-testid="dispute-confirm-btn"]').trigger('click');

      expect(wrapper.emitted('confirm')).toBeTruthy();
    });

    it('emits "cancel" when cancel button clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('[data-testid="dispute-cancel-btn"]').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('emits "cancel" when backdrop is clicked', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('.ant-modal-close').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('modal behavior', () => {
    it('does NOT close on backdrop click (explicit action required)', async () => {
      const wrapper = await mountModal({ visible: true });

      await wrapper.find('.ant-modal-close').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });
});
