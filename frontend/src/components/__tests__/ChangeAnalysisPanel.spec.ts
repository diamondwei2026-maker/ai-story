import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

interface ImpactedChapter {
  chapterNumber: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reason: string;
  status: 'PENDING' | 'FIXED' | 'SKIPPED' | 'DEFERRED';
}

interface ChangeAnalysisData {
  lastAnalyzedAt: string;
  sourceChangeFingerprint: string;
  impactedChapters: ImpactedChapter[];
}

function makeChangeAnalysis(
  impactedChapters: ImpactedChapter[],
): ChangeAnalysisData {
  return {
    lastAnalyzedAt: new Date().toISOString(),
    sourceChangeFingerprint: 'test-fingerprint',
    impactedChapters,
  };
}

function makeImpacted(opts: Partial<ImpactedChapter> = {}): ImpactedChapter {
  return {
    chapterNumber: opts.chapterNumber ?? 2,
    severity: opts.severity ?? 'MEDIUM',
    reason: opts.reason ?? '角色不一致',
    status: opts.status ?? 'PENDING',
  };
}

describe('ChangeAnalysisPanel', () => {
  const mountPanel = async (props: {
    changeAnalysis: ChangeAnalysisData | null;
    loading?: boolean;
  }) => {
    const { default: ChangeAnalysisPanel } = await import(
      '@/components/ChangeAnalysisPanel.vue'
    );
    return mount(ChangeAnalysisPanel, { props });
  };

  // ═══════════════════════════════════════════════════════════════
  // Empty / null state
  // ═══════════════════════════════════════════════════════════════

  describe('empty state', () => {
    it('renders empty placeholder when changeAnalysis is null', async () => {
      const wrapper = await mountPanel({ changeAnalysis: null });
      expect(wrapper.find('[data-testid="analysis-empty"]').exists()).toBe(true);
    });

    it('renders empty placeholder when impactedChapters is empty', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([]),
      });
      expect(wrapper.find('[data-testid="analysis-empty"]').exists()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Severity grouping
  // ═══════════════════════════════════════════════════════════════

  describe('severity grouping', () => {
    it('groups impacted chapters by severity (HIGH / MEDIUM / LOW)', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '角色死亡' }),
          makeImpacted({ chapterNumber: 3, severity: 'MEDIUM', reason: '外貌不一致' }),
          makeImpacted({ chapterNumber: 5, severity: 'LOW', reason: '背景提及' }),
        ]),
      });

      expect(wrapper.find('[data-testid="severity-group-HIGH"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="severity-group-MEDIUM"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="severity-group-LOW"]').exists()).toBe(true);
    });

    it('does NOT render NONE severity group', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '冲突' }),
          makeImpacted({ chapterNumber: 3, severity: 'NONE', reason: '无影响' }),
        ]),
      });

      expect(wrapper.find('[data-testid="severity-group-NONE"]').exists()).toBe(false);
    });

    it('renders chapter number and reason for each impacted chapter', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '角色性格矛盾' }),
        ]),
      });

      const group = wrapper.find('[data-testid="severity-group-HIGH"]');
      expect(group.text()).toContain('2');
      expect(group.text()).toContain('角色性格矛盾');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // HIGH severity — cannot DEFER
  // ═══════════════════════════════════════════════════════════════

  describe('HIGH severity', () => {
    it('does NOT show "Defer" button for HIGH severity items', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '严重冲突' }),
        ]),
      });

      const highGroup = wrapper.find('[data-testid="severity-group-HIGH"]');
      expect(highGroup.find('[data-testid="action-defer"]').exists()).toBe(false);
    });

    it('shows "Apply Fix" and "Skip" buttons for HIGH severity', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '严重冲突' }),
        ]),
      });

      const highGroup = wrapper.find('[data-testid="severity-group-HIGH"]');
      expect(highGroup.find('[data-testid="action-apply-fix"]').exists()).toBe(true);
      expect(highGroup.find('[data-testid="action-skip"]').exists()).toBe(true);
    });

    it('emits "apply-fix" with chapterNumber when Apply Fix clicked', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '严重冲突' }),
        ]),
      });

      await wrapper.find('[data-testid="action-apply-fix-2"]').trigger('click');
      expect(wrapper.emitted('apply-fix')).toBeTruthy();
      expect(wrapper.emitted('apply-fix')![0]).toEqual([2]);
    });

    it('emits "skip" with chapterNumber when Skip clicked', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '严重冲突' }),
        ]),
      });

      await wrapper.find('[data-testid="action-skip-2"]').trigger('click');
      expect(wrapper.emitted('skip')).toBeTruthy();
      expect(wrapper.emitted('skip')![0]).toEqual([2]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MEDIUM / LOW severity — can DEFER
  // ═══════════════════════════════════════════════════════════════

  describe('MEDIUM / LOW severity', () => {
    it('shows "Defer" button for MEDIUM severity items', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 3, severity: 'MEDIUM', reason: '外貌不一致' }),
        ]),
      });

      const medGroup = wrapper.find('[data-testid="severity-group-MEDIUM"]');
      expect(medGroup.find('[data-testid="action-defer"]').exists()).toBe(true);
    });

    it('shows "Defer" button for LOW severity items', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 5, severity: 'LOW', reason: '背景提及' }),
        ]),
      });

      const lowGroup = wrapper.find('[data-testid="severity-group-LOW"]');
      expect(lowGroup.find('[data-testid="action-defer"]').exists()).toBe(true);
    });

    it('emits "defer" with chapterNumber when Defer clicked', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 3, severity: 'MEDIUM', reason: '外貌不一致' }),
        ]),
      });

      await wrapper.find('[data-testid="action-defer-3"]').trigger('click');
      expect(wrapper.emitted('defer')).toBeTruthy();
      expect(wrapper.emitted('defer')![0]).toEqual([3]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Status display
  // ═══════════════════════════════════════════════════════════════

  describe('status display', () => {
    it('shows status badge for FIXED / SKIPPED / DEFERRED items', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '冲突', status: 'FIXED' }),
          makeImpacted({ chapterNumber: 3, severity: 'MEDIUM', reason: '外貌', status: 'DEFERRED' }),
          makeImpacted({ chapterNumber: 4, severity: 'LOW', reason: '背景', status: 'SKIPPED' }),
        ]),
      });

      expect(wrapper.find('[data-testid="status-badge-2"]').text()).toMatch(/FIXED/i);
      expect(wrapper.find('[data-testid="status-badge-3"]').text()).toMatch(/DEFERRED/i);
      expect(wrapper.find('[data-testid="status-badge-4"]').text()).toMatch(/SKIPPED/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Loading state
  // ═══════════════════════════════════════════════════════════════

  describe('loading state', () => {
    it('shows loading indicator when loading prop is true', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([]),
        loading: true,
      });

      expect(
        wrapper.find('[data-testid="analysis-loading-indicator"]').exists(),
      ).toBe(true);
    });

    it('disables action buttons while loading', async () => {
      const wrapper = await mountPanel({
        changeAnalysis: makeChangeAnalysis([
          makeImpacted({ chapterNumber: 2, severity: 'HIGH', reason: '冲突' }),
        ]),
        loading: true,
      });

      const btn = wrapper.find('[data-testid="action-apply-fix-2"]');
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
