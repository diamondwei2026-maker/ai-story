import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockBeatV2 = {
  id: 'beat-1',
  projectId: 'proj-1',
  chapterNumber: 1,
  plan: {},
  targetWordCount: 3000,
  hookCount: 2,
  isClimax: false,
  useR1: false,
  status: 'PENDING',
  narrativeSummary: '主角在垃圾星意外发现了一艘星舰，AI声称自己是千年前失踪的帝国旗舰',
  conflictDescription: '主角必须在48小时内修复星舰引擎，否则整个星区将被自毁程序炸毁',
  pacingLabel: '快',
  hookCausalChain: [
    { hook: 'AI的真实身份', resolvesInChapter: 3 },
    { hook: '自毁倒计时', resolvesInChapter: 1 },
  ],
  conflictIntensity: 4,
  readerExpectation: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('BeatNarrativeCard', () => {
  const mountCard = async (props: {
    beat: typeof mockBeatV2;
    isExpanded?: boolean;
    isAffected?: boolean;
  }) => {
    const { default: BeatNarrativeCard } = await import('@/components/BeatNarrativeCard.vue');
    return mount(BeatNarrativeCard, {
      props: {
        isExpanded: false,
        isAffected: false,
        ...props,
      },
    });
  };

  // ── Collapsed state (Layer 1) ──────────────────────

  describe('collapsed state (Layer 1)', () => {
    it('renders the card container', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="beat-narrative-card"]').exists()).toBe(true);
    });

    it('displays chapter number badge', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-chapter"]').text()).toContain('第1章');
    });

    it('displays narrative summary', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-summary"]').text()).toContain('垃圾星');
    });

    it('displays word count', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-wordcount"]').text()).toContain('3000');
    });

    it('displays pacing label with tag', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-pacing"]').text()).toBe('快');
    });

    it('displays conflict intensity score', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.text()).toContain('冲突 4/5');
    });

    it('shows 暂无叙事摘要 when narrativeSummary is empty', async () => {
      const beat = { ...mockBeatV2, narrativeSummary: '' };
      const wrapper = await mountCard({ beat });
      expect(wrapper.find('[data-testid="narrative-card-summary"]').text()).toContain('暂无叙事摘要');
    });

    it('shows 暂无冲突描述 when conflictDescription is empty', async () => {
      const beat = { ...mockBeatV2, conflictDescription: '' };
      const wrapper = await mountCard({ beat, isExpanded: true });
      expect(wrapper.find('[data-testid="narrative-card-conflict-desc"]').text()).toContain('暂无冲突描述');
    });

    it('emits toggle-expand when header is clicked', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      await wrapper.find('[data-testid="narrative-card-header"]').trigger('click');
      expect(wrapper.emitted('toggle-expand')?.[0]).toEqual(['beat-1']);
    });

    it('emits toggle-expand when summary is clicked', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      await wrapper.find('[data-testid="narrative-card-summary"]').trigger('click');
      expect(wrapper.emitted('toggle-expand')?.[0]).toEqual(['beat-1']);
    });

    it('shows "展开" hint when collapsed', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: false });
      expect(wrapper.find('[data-testid="narrative-card-expand-hint"]').text()).toBe('展开');
    });

    it('shows "收起" hint when expanded', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      expect(wrapper.find('[data-testid="narrative-card-expand-hint"]').text()).toBe('收起');
    });
  });

  // ── Expanded state (Layer 2) ───────────────────────

  describe('expanded state (Layer 2)', () => {
    it('shows expanded section when isExpanded is true', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      expect(wrapper.find('[data-testid="narrative-card-expanded"]').exists()).toBe(true);
    });

    it('hides expanded section when isExpanded is false', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: false });
      expect(wrapper.find('[data-testid="narrative-card-expanded"]').exists()).toBe(false);
    });

    it('displays conflict description in expanded state', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      expect(wrapper.find('[data-testid="narrative-card-conflict-desc"]').text()).toContain('48小时');
    });

    it('displays hook causal chain in expanded state', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      const hookLinks = wrapper.findAll('[data-testid="narrative-card-hook-link"]');
      expect(hookLinks.length).toBe(2);
    });

    it('shows hook resolve target in expanded state', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      expect(wrapper.text()).toContain('回收于第3章');
    });

    it('shows "暂无钩子" when hookCausalChain is empty', async () => {
      const beat = { ...mockBeatV2, hookCausalChain: [], isExpanded: true };
      const wrapper = await mountCard({ beat, isExpanded: true });
      expect(wrapper.text()).toContain('暂无钩子');
    });
  });

  // ── Badges ─────────────────────────────────────────

  describe('badges', () => {
    it('shows climax badge when isClimax is true', async () => {
      const beat = { ...mockBeatV2, isClimax: true };
      const wrapper = await mountCard({ beat });
      expect(wrapper.find('[data-testid="narrative-card-climax-badge"]').exists()).toBe(true);
    });

    it('hides climax badge when isClimax is false', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-climax-badge"]').exists()).toBe(false);
    });

    it('shows STALE badge when status is STALE', async () => {
      const beat = { ...mockBeatV2, status: 'STALE' };
      const wrapper = await mountCard({ beat });
      expect(wrapper.find('[data-testid="narrative-card-stale-badge"]').exists()).toBe(true);
    });

    it('hides STALE badge when status is not STALE', async () => {
      const wrapper = await mountCard({ beat: { ...mockBeatV2, status: 'PENDING' } });
      expect(wrapper.find('[data-testid="narrative-card-stale-badge"]').exists()).toBe(false);
    });

    it('shows affected badge when isAffected is true', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isAffected: true });
      expect(wrapper.find('[data-testid="narrative-card-affected-badge"]').exists()).toBe(true);
    });

    it('hides affected badge when isAffected is false', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isAffected: false });
      expect(wrapper.find('[data-testid="narrative-card-affected-badge"]').exists()).toBe(false);
    });
  });

  // ── "换一种写法" dropdown ──────────────────────────

  describe('"换一种写法" dropdown', () => {
    it('renders the rewrite button', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2 });
      expect(wrapper.find('[data-testid="narrative-card-rewrite-btn"]').exists()).toBe(true);
    });
  });

  // ── Card styling ───────────────────────────────────

  describe('card styling', () => {
    it('applies expanded class when isExpanded', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isExpanded: true });
      expect(wrapper.classes()).toContain('narrative-card--expanded');
    });

    it('applies affected class when isAffected', async () => {
      const wrapper = await mountCard({ beat: mockBeatV2, isAffected: true });
      expect(wrapper.classes()).toContain('narrative-card--affected');
    });
  });

  // ── Edge cases ─────────────────────────────────────

  describe('edge cases', () => {
    it('handles beat without hookCausalChain gracefully', async () => {
      const beat = { ...mockBeatV2, hookCausalChain: [] as any };
      const wrapper = await mountCard({ beat, isExpanded: true });
      expect(wrapper.find('[data-testid="narrative-card-expanded"]').exists()).toBe(true);
    });

    it('displays higher chapter numbers correctly', async () => {
      const beat = { ...mockBeatV2, chapterNumber: 42 };
      const wrapper = await mountCard({ beat });
      expect(wrapper.find('[data-testid="narrative-card-chapter"]').text()).toContain('第42章');
    });

    it('shows resolve info in hook link when resolvesInChapter is set', async () => {
      const beat = {
        ...mockBeatV2,
        hookCausalChain: [{ hook: '核心谜题', resolvesInChapter: 10 }],
      };
      const wrapper = await mountCard({ beat, isExpanded: true });
      expect(wrapper.text()).toContain('回收于第10章');
    });

    it('does not show resolve info when resolvesInChapter is null', async () => {
      const beat = {
        ...mockBeatV2,
        hookCausalChain: [{ hook: '悬而未决', resolvesInChapter: null }],
        isExpanded: true,
      };
      const wrapper = await mountCard({ beat, isExpanded: true });
      const hookText = wrapper.find('[data-testid="narrative-card-hook-link"]').text();
      expect(hookText).not.toContain('回收于');
    });
  });
});
