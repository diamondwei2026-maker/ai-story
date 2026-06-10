import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ReviewVerdict } from '@/types';

const defaultProps = {
  chapterStatus: 'PENDING' as const,
  reviewVerdict: null as ReviewVerdict | null,
  appealCount: 0,
  isGenerating: false,
  isPaused: false,
  hasContent: false,
};

async function mountActionBar(
  overrides: Partial<typeof defaultProps> = {},
) {
  const { default: ChapterActionBar } = await import(
    '@/components/ChapterActionBar.vue'
  );
  return mount(ChapterActionBar, {
    props: { ...defaultProps, ...overrides },
  });
}

describe('ChapterActionBar', () => {
  // ══════════════════════════════════════════════════════════════════
  // PENDING + isGenerating state should NOT show generate
  // ══════════════════════════════════════════════════════════════════

  describe('PENDING + isGenerating state', () => {
    it('does not show generate button while generating', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'PENDING',
        isGenerating: true,
        isPaused: false,
      });
      expect(wrapper.find('[data-testid="btn-generate"]').exists()).toBe(false);
    });
  });
  // PENDING: generate
  describe('PENDING state', () => {
    it('renders generate button when PENDING and not generating', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'PENDING',
        isGenerating: false,
        hasContent: false,
      });
      expect(wrapper.find('[data-testid="btn-generate"]').exists()).toBe(true);
    });

    it('emits generate when button clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'PENDING',
        isGenerating: false,
        hasContent: false,
      });
      await wrapper.find('[data-testid="btn-generate"]').trigger('click');
      expect(wrapper.emitted('generate')).toBeTruthy();
    });
  });

  // Generating: pause / continue
  describe('generating state', () => {
    it('renders pause button when generating and not paused', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: true,
        isPaused: false,
      });
      expect(wrapper.find('[data-testid="btn-pause"]').exists()).toBe(true);
    });

    it('emits pause when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: true,
        isPaused: false,
      });
      await wrapper.find('[data-testid="btn-pause"]').trigger('click');
      expect(wrapper.emitted('pause')).toBeTruthy();
    });

    it('renders continue button when paused', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: true,
      });
      expect(wrapper.find('[data-testid="btn-continue"]').exists()).toBe(true);
    });

    it('emits continue when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: true,
      });
      await wrapper.find('[data-testid="btn-continue"]').trigger('click');
      expect(wrapper.emitted('continue')).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Content exists, no review verdict — submit-review + retry
  // ══════════════════════════════════════════════════════════════════

  describe('content exists, no review verdict', () => {
    it('shows submit-review and retry buttons when content exists and not terminal', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: false,
        hasContent: true,
        reviewVerdict: null,
      });

      expect(wrapper.find('[data-testid="btn-submit-review"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-retry"]').exists()).toBe(true);
    });

    it('emits submit-review when button clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: false,
        hasContent: true,
        reviewVerdict: null,
      });

      await wrapper.find('[data-testid="btn-submit-review"]').trigger('click');
      expect(wrapper.emitted('submit-review')).toBeTruthy();
    });

    it('shows feedback input alongside retry button', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: false,
        hasContent: true,
        reviewVerdict: null,
      });

      expect(wrapper.find('[data-testid="retry-feedback-input"]').exists()).toBe(true);
    });

    it('emits retry with feedback text', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DRAFT',
        isGenerating: false,
        isPaused: false,
        hasContent: true,
        reviewVerdict: null,
      });

      const input = wrapper.find('[data-testid="retry-feedback-input"]');
      await input.setValue('希望风格更热血');
      await wrapper.find('[data-testid="btn-retry"]').trigger('click');

      expect(wrapper.emitted('retry')).toBeTruthy();
      expect(wrapper.emitted('retry')![0]).toEqual(['希望风格更热血']);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Verdict: PASS — confirm
  // ══════════════════════════════════════════════════════════════════

  describe('PASS verdict', () => {
    it('shows confirm button when verdict is PASS', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS',
      });

      expect(wrapper.find('[data-testid="btn-confirm"]').exists()).toBe(true);
    });

    it('emits confirm when button clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS',
      });

      await wrapper.find('[data-testid="btn-confirm"]').trigger('click');
      expect(wrapper.emitted('confirm')).toBeTruthy();
    });

    it('does not show generate/retry/submit-review for PASS verdict', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS',
      });

      expect(wrapper.find('[data-testid="btn-generate"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="btn-submit-review"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="btn-retry"]').exists()).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Verdict: PASS_WITH_SUGGESTIONS
  // ══════════════════════════════════════════════════════════════════

  describe('PASS_WITH_SUGGESTIONS verdict', () => {
    it('shows adopt-suggestions and ignore-and-confirm buttons', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS_WITH_SUGGESTIONS',
      });

      expect(wrapper.find('[data-testid="btn-adopt-suggestions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-ignore-and-confirm"]').exists()).toBe(true);
    });

    it('emits adopt-suggestions when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS_WITH_SUGGESTIONS',
      });

      await wrapper.find('[data-testid="btn-adopt-suggestions"]').trigger('click');
      expect(wrapper.emitted('adopt-suggestions')).toBeTruthy();
    });

    it('emits ignore-and-confirm when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS_WITH_SUGGESTIONS',
      });

      await wrapper.find('[data-testid="btn-ignore-and-confirm"]').trigger('click');
      expect(wrapper.emitted('ignore-and-confirm')).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Verdict: NEEDS_REVISION
  // ══════════════════════════════════════════════════════════════════

  describe('NEEDS_REVISION verdict', () => {
    it('shows adopt-re-review, manual-edit, retry, and appeal buttons', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'NEEDS_REVISION',
      });

      expect(wrapper.find('[data-testid="btn-adopt-and-re-review"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-manual-edit"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-retry"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-appeal"]').exists()).toBe(true);
    });

    it('emits manual-edit when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'NEEDS_REVISION',
      });

      await wrapper.find('[data-testid="btn-manual-edit"]').trigger('click');
      expect(wrapper.emitted('manual-edit')).toBeTruthy();
    });

    it('emits appeal when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'NEEDS_REVISION',
      });

      await wrapper.find('[data-testid="btn-appeal"]').trigger('click');
      expect(wrapper.emitted('appeal')).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Verdict: BLOCKED
  // ══════════════════════════════════════════════════════════════════

  describe('BLOCKED verdict', () => {
    it('shows manual-edit, retry, appeal buttons (no adopt button)', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'BLOCKED',
      });

      expect(wrapper.find('[data-testid="btn-manual-edit"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-retry"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-appeal"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-adopt-suggestions"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="btn-adopt-and-re-review"]').exists()).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Appeal already filed (appealCount >= 1)
  // ══════════════════════════════════════════════════════════════════

  describe('appeal already filed', () => {
    it('shows force-dispute instead of appeal when appealCount >= 1', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'NEEDS_REVISION',
        appealCount: 1,
      });

      expect(wrapper.find('[data-testid="btn-appeal"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="btn-force-dispute"]').exists()).toBe(true);
    });

    it('emits force-dispute when clicked', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'REVIEWING',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'BLOCKED',
        appealCount: 1,
      });

      await wrapper.find('[data-testid="btn-force-dispute"]').trigger('click');
      expect(wrapper.emitted('force-dispute')).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Terminal states: COMPLETED / DISPUTED — no action buttons
  // ══════════════════════════════════════════════════════════════════

  describe('terminal states', () => {
    it('renders no action buttons for COMPLETED chapter', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'COMPLETED',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'PASS',
      });

      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });

    it('renders no action buttons for DISPUTED chapter', async () => {
      const wrapper = await mountActionBar({
        chapterStatus: 'DISPUTED',
        isGenerating: false,
        hasContent: true,
        reviewVerdict: 'NEEDS_REVISION',
      });

      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(0);
    });
  });
});
