import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

type ReviewVerdict =
  | 'PASS'
  | 'PASS_WITH_SUGGESTIONS'
  | 'NEEDS_REVISION'
  | 'BLOCKED';

interface ReviewIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  rule: string;
  suggestion: string;
  autoFixable: boolean;
}

interface ReviewResult {
  verdict: ReviewVerdict;
  dimensions: {
    POLITICAL_SAFETY: { score: number; issues: ReviewIssue[] };
    SEXUAL_CONTENT: { score: number; issues: ReviewIssue[] };
    VIOLENCE: { score: number; issues: ReviewIssue[] };
    VALUES: { score: number; issues: ReviewIssue[] };
  };
  overallScore: number;
  appealCount: number;
  reviewedAt: string;
}

function makeReviewResult(
  overrides: Partial<ReviewResult> = {},
): ReviewResult {
  return {
    verdict: 'PASS',
    dimensions: {
      POLITICAL_SAFETY: { score: 10, issues: [] },
      SEXUAL_CONTENT: { score: 10, issues: [] },
      VIOLENCE: { score: 10, issues: [] },
      VALUES: { score: 10, issues: [] },
    },
    overallScore: 10,
    appealCount: 0,
    reviewedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ReviewPanel', () => {
  const mountPanel = async (props: {
    reviewResult: ReviewResult;
    chapterStatus: string;
    loading?: boolean;
  }) => {
    const { default: ReviewPanel } = await import(
      '@/components/ReviewPanel.vue'
    );
    return mount(ReviewPanel, { props });
  };

  // ─── PASS verdict ────────────────────────────────────────────

  describe('PASS verdict', () => {
    it('renders no action buttons (auto-confirm)', async () => {
      const wrapper = await mountPanel({
        reviewResult: makeReviewResult({ verdict: 'PASS' }),
        chapterStatus: 'REVIEWING',
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      expect(buttons).toHaveLength(0);
    });

    it('renders a "PASS" status badge or indicator', async () => {
      const wrapper = await mountPanel({
        reviewResult: makeReviewResult({ verdict: 'PASS' }),
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="verdict-badge"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="verdict-badge"]').text()).toMatch(
        /PASS/i,
      );
    });
  });

  // ─── PASS_WITH_SUGGESTIONS verdict ────────────────────────────

  describe('PASS_WITH_SUGGESTIONS verdict', () => {
    let result: ReviewResult;

    beforeEach(() => {
      result = makeReviewResult({
        verdict: 'PASS_WITH_SUGGESTIONS',
        dimensions: {
          POLITICAL_SAFETY: {
            score: 7,
            issues: [
              {
                severity: 'MEDIUM',
                location: '第3段',
                rule: '避免敏感隐喻',
                suggestion: '将"铁腕镇压"改为"迅速平息"',
                autoFixable: true,
              },
            ],
          },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it('renders "Adopt suggestions" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      const labels = buttons.map((b) => b.text());
      expect(labels).toEqual(
        expect.arrayContaining([expect.stringMatching(/采纳/i)]),
      );
    });

    it('renders "Ignore and confirm" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      const labels = buttons.map((b) => b.text());
      expect(labels).toEqual(
        expect.arrayContaining([expect.stringMatching(/忽略/i)]),
      );
    });

    it('emits "adopt-suggestions" event when adopt button clicked', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const adoptBtn = wrapper.find('[data-testid="action-adopt_suggestions"]');
      expect(adoptBtn.exists()).toBe(true);
      await adoptBtn.trigger('click');

      expect(wrapper.emitted('adopt-suggestions')).toBeTruthy();
    });

    it('emits "ignore-and-confirm" event when ignore button clicked', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const ignoreBtn = wrapper.find('[data-testid="action-ignore_and_confirm"]');
      expect(ignoreBtn.exists()).toBe(true);
      await ignoreBtn.trigger('click');

      expect(wrapper.emitted('ignore-and-confirm')).toBeTruthy();
    });

    it('displays review issues/suggestions list', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="review-issues"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('铁腕镇压');
    });
  });

  // ─── NEEDS_REVISION verdict ───────────────────────────────────

  describe('NEEDS_REVISION verdict', () => {
    let result: ReviewResult;

    beforeEach(() => {
      result = makeReviewResult({
        verdict: 'NEEDS_REVISION',
        overallScore: 4.5,
        dimensions: {
          POLITICAL_SAFETY: {
            score: 4,
            issues: [
              {
                severity: 'HIGH',
                location: '第1段',
                rule: '禁止涉政',
                suggestion: '移除敏感政治隐喻',
                autoFixable: false,
              },
            ],
          },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it('renders exactly 3 action buttons', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      expect(buttons).toHaveLength(3);
    });

    it('renders "Adopt and re-review" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="action-adopt_and_re_review"]').exists(),
      ).toBe(true);
    });

    it('renders "Manual edit" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="action-manual_edit"]').exists(),
      ).toBe(true);
    });

    it('renders "Appeal" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="action-appeal"]').exists()).toBe(true);
    });

    it('emits "manual-edit" when manual edit button clicked', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      await wrapper
        .find('[data-testid="action-manual_edit"]')
        .trigger('click');
      expect(wrapper.emitted('manual-edit')).toBeTruthy();
    });

    it('emits "appeal" when appeal button clicked', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      await wrapper.find('[data-testid="action-appeal"]').trigger('click');
      expect(wrapper.emitted('appeal')).toBeTruthy();
    });
  });

  // ─── BLOCKED verdict ──────────────────────────────────────────

  describe('BLOCKED verdict', () => {
    let result: ReviewResult;

    beforeEach(() => {
      result = makeReviewResult({
        verdict: 'BLOCKED',
        overallScore: 2.0,
        dimensions: {
          POLITICAL_SAFETY: {
            score: 1,
            issues: [
              {
                severity: 'CRITICAL',
                location: '全文',
                rule: '零容忍红线',
                suggestion: '需要完全重写此章节',
                autoFixable: false,
              },
            ],
          },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it('renders exactly 2 action buttons (no one-click adopt)', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      expect(buttons).toHaveLength(2);
    });

    it('renders "Manual edit" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="action-manual_edit"]').exists(),
      ).toBe(true);
    });

    it('renders "Appeal" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="action-appeal"]').exists()).toBe(true);
    });

    it('does NOT render any "adopt" or "accept" button', async () => {
      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="action-adopt_suggestions"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="action-adopt_and_re_review"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="action-ignore_and_confirm"]').exists()).toBe(false);
    });
  });

  // ─── Appeal already filed ────────────────────────────────────

  describe('when appeal has already been filed', () => {
    it('does not show appeal button when appealCount >= 1', async () => {
      const result = makeReviewResult({
        verdict: 'NEEDS_REVISION',
        appealCount: 1,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="action-appeal"]').exists()).toBe(
        false,
      );
    });

    it('shows "Force dispute" option after appeal upheld', async () => {
      const result = makeReviewResult({
        verdict: 'NEEDS_REVISION',
        appealCount: 1,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="action-force_dispute"]').exists(),
      ).toBe(true);
    });

    it('shows "Edit again" option after appeal upheld', async () => {
      const result = makeReviewResult({
        verdict: 'BLOCKED',
        appealCount: 1,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="action-manual_edit"]').exists(),
      ).toBe(true);
    });
  });

  // ─── Loading state ───────────────────────────────────────────

  describe('loading state', () => {
    it('disables all action buttons while loading', async () => {
      const result = makeReviewResult({ verdict: 'PASS_WITH_SUGGESTIONS' });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
        loading: true,
      });

      const buttons = wrapper.findAll('.review-panel__action-btn');
      for (const btn of buttons) {
        expect((btn.element as HTMLButtonElement).disabled).toBe(true);
      }
    });

    it('shows loading indicator when loading prop is true', async () => {
      const result = makeReviewResult({ verdict: 'PASS_WITH_SUGGESTIONS' });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
        loading: true,
      });

      expect(
        wrapper.find('[data-testid="review-loading-indicator"]').exists(),
      ).toBe(true);
    });
  });

  // ─── Score display ───────────────────────────────────────────

  describe('score display', () => {
    it('renders overallScore', async () => {
      const result = makeReviewResult({
        verdict: 'PASS_WITH_SUGGESTIONS',
        overallScore: 7.5,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="overall-score"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="overall-score"]').text()).toContain(
        '7.5',
      );
    });

    it('renders all four dimension scores', async () => {
      const result = makeReviewResult({ verdict: 'PASS' });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(
        wrapper.find('[data-testid="dimension-POLITICAL_SAFETY"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="dimension-SEXUAL_CONTENT"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="dimension-VIOLENCE"]').exists(),
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="dimension-VALUES"]').exists(),
      ).toBe(true);
    });
  });
});
