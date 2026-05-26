import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('TargetedFixDiff', () => {
  const mountDiff = async (props: {
    sourceContent: string;
    patchContent: string;
    loading?: boolean;
  }) => {
    const { default: TargetedFixDiff } = await import(
      '@/components/TargetedFixDiff.vue'
    );
    return mount(TargetedFixDiff, { props });
  };

  // ═══════════════════════════════════════════════════════════════
  // Diff display
  // ═══════════════════════════════════════════════════════════════

  describe('diff display', () => {
    it('renders both source and patch content in diff view', async () => {
      const wrapper = await mountDiff({
        sourceContent: '原始内容：主角登场。',
        patchContent: '修补内容：主角果断登场。',
      });

      expect(wrapper.find('[data-testid="diff-source"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="diff-patch"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="diff-source"]').text()).toContain('原始内容');
      expect(wrapper.find('[data-testid="diff-patch"]').text()).toContain('修补内容');
    });

    it('renders "Confirm" and "Cancel" buttons', async () => {
      const wrapper = await mountDiff({
        sourceContent: '原始内容。',
        patchContent: '修补内容。',
      });

      expect(wrapper.find('[data-testid="diff-confirm"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="diff-cancel"]').exists()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════════════════

  describe('events', () => {
    it('emits "confirm" when confirm button clicked', async () => {
      const wrapper = await mountDiff({
        sourceContent: '原始内容。',
        patchContent: '修补内容。',
      });

      await wrapper.find('[data-testid="diff-confirm"]').trigger('click');
      expect(wrapper.emitted('confirm')).toBeTruthy();
    });

    it('emits "cancel" when cancel button clicked', async () => {
      const wrapper = await mountDiff({
        sourceContent: '原始内容。',
        patchContent: '修补内容。',
      });

      await wrapper.find('[data-testid="diff-cancel"]').trigger('click');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Loading state
  // ═══════════════════════════════════════════════════════════════

  describe('loading state', () => {
    it('disables buttons while loading', async () => {
      const wrapper = await mountDiff({
        sourceContent: '原始内容。',
        patchContent: '修补内容。',
        loading: true,
      });

      const confirmBtn = wrapper.find('[data-testid="diff-confirm"]');
      expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
