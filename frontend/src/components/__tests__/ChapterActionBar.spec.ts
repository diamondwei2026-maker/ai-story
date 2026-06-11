import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('ChapterActionBar', () => {
  const mountBar = async (props: {
    chapterStatus: string;
    reviewVerdict?: string | null;
    appealCount?: number;
    isGenerating?: boolean;
    isPaused?: boolean;
    hasContent?: boolean;
  }) => {
    const { default: ChapterActionBar } = await import(
      '@/components/ChapterActionBar.vue'
    );
    return mount(ChapterActionBar, {
      props: {
        chapterStatus: 'PENDING_REVIEW',
        reviewVerdict: null,
        appealCount: 0,
        isGenerating: false,
        isPaused: false,
        hasContent: true,
        ...props,
      },
    });
  };

  describe('retry mode selector', () => {
    it('renders a mode select dropdown in the retry section when hasContent and no verdict', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
      });

      const select = wrapper.find('[data-testid="retry-mode-select"]');
      expect(select.exists()).toBe(true);
    });

    it('defaults mode to new-continue with label text shown', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
      });

      // Ant Design a-select renders the selected label in .ant-select-selection-item
      const selectionItem = wrapper.find('.ant-select-selection-item');
      expect(selectionItem.exists()).toBe(true);
      expect(selectionItem.text()).toContain('新建续写');
    });

    it('does not render mode selector when generating', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
        isGenerating: true,
      });

      const select = wrapper.find('[data-testid="retry-mode-select"]');
      expect(select.exists()).toBe(false);
    });

    it('does not render mode selector for terminal statuses', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'COMPLETED',
        hasContent: true,
        reviewVerdict: 'PASS',
      });

      const select = wrapper.find('[data-testid="retry-mode-select"]');
      expect(select.exists()).toBe(false);
    });

    it('renders save button when chapterStatus is PENDING_REVIEW and hasContent', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
      });

      const saveBtn = wrapper.find('[data-testid="btn-save-content"]');
      expect(saveBtn.exists()).toBe(true);
    });

    it('does not render save button when chapterStatus is not PENDING_REVIEW', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'DRAFT',
        hasContent: true,
        reviewVerdict: null,
      });

      const saveBtn = wrapper.find('[data-testid="btn-save-content"]');
      expect(saveBtn.exists()).toBe(false);
    });

    it('emits save-content when save button is clicked', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
      });

      const saveBtn = wrapper.find('[data-testid="btn-save-content"]');
      await saveBtn.trigger('click');

      expect(wrapper.emitted('save-content')).toBeTruthy();
    });

    it('emits retry with mode and feedback when retry button is clicked', async () => {
      const wrapper = await mountBar({
        chapterStatus: 'PENDING_REVIEW',
        hasContent: true,
        reviewVerdict: null,
      });

      const input = wrapper.find('[data-testid="retry-feedback-input"]');
      await input.setValue('some feedback');

      const retryBtn = wrapper.find('[data-testid="btn-retry"]');
      await retryBtn.trigger('click');

      const retryEvents = wrapper.emitted('retry');
      expect(retryEvents).toBeTruthy();
      expect(retryEvents![0]).toEqual([
        'some feedback',
        'new-continue',
      ]);
    });

  });
});
