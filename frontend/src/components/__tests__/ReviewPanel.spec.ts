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
    it('displays review issues/suggestions list', async () => {
      const result = makeReviewResult({
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

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      expect(wrapper.find('[data-testid="review-issues"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('铁腕镇压');
    });
  });

  // ─── NEEDS_REVISION verdict ───────────────────────────────────

  // ─── Loading state ───────────────────────────────────────────

  describe('loading state', () => {
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

      // Dimensions rendered via <a-descriptions>, check by text content
      expect(wrapper.text()).toContain('政治安全');
      expect(wrapper.text()).toContain('色情尺度');
      expect(wrapper.text()).toContain('暴力渲染');
      expect(wrapper.text()).toContain('价值观');
      expect(wrapper.text()).toContain('10');
    });

    it('survives missing overallScore without crashing', async () => {
      const result = makeReviewResult({
        verdict: 'PASS',
        overallScore: undefined as any,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      // Should render without throwing — shows fallback score
      expect(wrapper.find('[data-testid="overall-score"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="overall-score"]').text()).toMatch(
        /\d+\.\d/,
      );
    });

    it('survives missing dimensions without crashing', async () => {
      const result = makeReviewResult({
        verdict: 'PASS',
        overallScore: 10,
        dimensions: undefined as any,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      // Should render without throwing — each dimension shows fallback
      expect(wrapper.text()).toContain('政治安全');
      expect(wrapper.text()).toContain('色情尺度');
      expect(wrapper.text()).toContain('暴力渲染');
      expect(wrapper.text()).toContain('价值观');
    });

    it('survives missing verdict without crashing', async () => {
      const result = makeReviewResult({
        verdict: undefined as any,
        overallScore: 10,
      });

      const wrapper = await mountPanel({
        reviewResult: result,
        chapterStatus: 'REVIEWING',
      });

      // Should render without throwing — shows fallback verdict badge with meaningful text
      const badge = wrapper.find('[data-testid="verdict-badge"]');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBeTruthy();
      expect(badge.text()).not.toBe('undefined');
    });
  });
});
