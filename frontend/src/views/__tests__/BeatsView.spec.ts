import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const mockGetBeats = vi.fn();
const mockGenerateBeats = vi.fn();
const mockConfirmBeats = vi.fn();
const mockRejectBeats = vi.fn();
const mockAdjustBeat = vi.fn();
const mockUpdateBeatWordCount = vi.fn();
const mockUpdateBeatStructure = vi.fn();

vi.mock('@/api/beats', () => ({
  getBeats: (...args: any[]) => mockGetBeats(...args),
  generateBeats: (...args: any[]) => mockGenerateBeats(...args),
  confirmBeats: (...args: any[]) => mockConfirmBeats(...args),
  rejectBeats: (...args: any[]) => mockRejectBeats(...args),
  adjustBeat: (...args: any[]) => mockAdjustBeat(...args),
  updateBeatWordCount: (...args: any[]) => mockUpdateBeatWordCount(...args),
  updateBeatStructure: (...args: any[]) => mockUpdateBeatStructure(...args),
}));

const mockGetOutline = vi.fn();
vi.mock('@/api/outline', () => ({
  getOutline: (...args: any[]) => mockGetOutline(...args),
}));

const mockGetProject = vi.fn();
vi.mock('@/api/project', () => ({
  getProject: (...args: any[]) => mockGetProject(...args),
}));

const mockOutline = {
  id: 'step-outline', projectId: 'proj-1', phaseType: 'OUTLINE',
  status: 'CONFIRMED', output: '第一幕：启程\n第二幕：探索\n第三幕：决战',
  review: {}, version: 1,
};

const mockProject = {
  id: 'proj-1',
  title: '测试项目',
  status: 'BEATS',
  config: { defaultChapterWordCount: 3000 },
};

const mockBeatsV2 = [
  {
    id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
    plan: {}, targetWordCount: 3000, hookCount: 2,
    isClimax: false, useR1: false, status: 'PENDING',
    narrativeSummary: '主角在垃圾星发现了一艘完好无损的星舰',
    conflictDescription: '主角必须修复引擎，否则星区将被炸毁',
    pacingLabel: '快', hookCausalChain: [{ hook: 'AI身份', resolvesInChapter: 3 }],
    conflictIntensity: 4, readerExpectation: 5,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    id: 'beat-2', projectId: 'proj-1', chapterNumber: 2,
    plan: {}, targetWordCount: 3500, hookCount: 1,
    isClimax: false, useR1: false, status: 'PENDING',
    narrativeSummary: '主角伪装进入海盗基地谈判，发现海盗头目认识原主的父亲',
    conflictDescription: '谈判桌上的两难选择——交出数据换取零件还是暴露身份',
    pacingLabel: '中', hookCausalChain: [{ hook: '海盗头目身份', resolvesInChapter: 5 }],
    conflictIntensity: 3, readerExpectation: 4,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    id: 'beat-3', projectId: 'proj-1', chapterNumber: 3,
    plan: {}, targetWordCount: 4000, hookCount: 3,
    isClimax: true, useR1: true, status: 'PENDING',
    narrativeSummary: '星舰AI解锁记忆数据，揭示千年阴谋',
    conflictDescription: 'AI证据指向主角家族敌人，信任根基被撼动',
    pacingLabel: '快', hookCausalChain: [
      { hook: 'AI身份（回收）', resolvesInChapter: 3 },
      { hook: '父亲的秘密', resolvesInChapter: 8 },
      { hook: '帝国阴谋', resolvesInChapter: 15 },
    ],
    conflictIntensity: 5, readerExpectation: 5,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
];

const mockConfirmResponse = {
  id: 'step-1', projectId: 'test-project-1',
  phaseType: 'BEATS', status: 'CONFIRMED',
  output: '', review: { beatCount: 3 }, version: 1,
  confirmedAt: new Date().toISOString(),
};

describe('BeatsView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockGetOutline.mockResolvedValue(mockOutline);
    mockGetProject.mockResolvedValue(mockProject);
  });

  const mountView = async () => {
    const { default: BeatsView } = await import('@/views/BeatsView.vue');

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/project/:id', name: 'workflow', component: { template: '<div />' } },
      ],
    });
    await router.push('/project/test-project-1');
    await router.isReady();

    return mount(BeatsView, {
      props: { projectId: 'test-project-1' },
      global: { plugins: [router] },
    });
  };

  // ═══════════════════════════════════════════════════════════
  // State Machine: CONFIG → GENERATING → REVIEWING → CONFIRMED
  // ═══════════════════════════════════════════════════════════

  describe('state machine: CONFIG state', () => {
    it('renders BeatsConfigPanel when no beats exist and not confirmed', async () => {
      mockGetBeats.mockResolvedValue([]);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-config-panel"]').exists()).toBe(true);
    });

    it('does NOT auto-generate beats on mount', async () => {
      mockGetBeats.mockResolvedValue([]);

      await mountView();
      await new Promise((r) => setTimeout(r, 100));

      expect(mockGenerateBeats).not.toHaveBeenCalled();
    });

    it('does not show beat cards in CONFIG state', async () => {
      mockGetBeats.mockResolvedValue([]);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beat-narrative-card"]').exists()).toBe(false);
    });
  });

  describe('state machine: CONFIG → GENERATING transition', () => {
    it('triggers generateBeats when "开始拆解" is clicked', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      expect(mockGenerateBeats).toHaveBeenCalledWith('test-project-1', expect.objectContaining({
        outline: expect.any(String),
      }));
    });

    it('passes targetChapterCount and defaultWordCount to generateBeats', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      const callArgs = mockGenerateBeats.mock.calls[0];
      expect(callArgs[0]).toBe('test-project-1');
      expect(callArgs[1]).toHaveProperty('targetChapterCount');
      expect(callArgs[1]).toHaveProperty('defaultWordCount');
    });
  });

  describe('state machine: GENERATING state', () => {
    it('shows loading spinner while generating', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockImplementation(() => new Promise(() => {})); // never resolves

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-loading"]').exists()).toBe(true);
    });
  });

  describe('state machine: REVIEWING state', () => {
    it('shows beat cards when beats exist and not confirmed', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beat-narrative-card"]').exists()).toBe(true);
    });

    it('shows BeatsStatsBar in REVIEWING state', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-stats-bar"]').exists()).toBe(true);
    });

    it('shows confirm and reject buttons in REVIEWING state', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-beats-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="reject-beats-btn"]').exists()).toBe(true);
    });

    it('does NOT show BeatsConfigPanel when beats exist', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-config-panel"]').exists()).toBe(false);
    });

    it('renders rhythm chart collapse', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('.beats-view__collapse').exists()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Confirm / Reject flow
  // ═══════════════════════════════════════════════════════════

  describe('confirm flow', () => {
    it('calls confirmBeats API when confirm button clicked', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);
      mockConfirmBeats.mockResolvedValue(mockConfirmResponse);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="confirm-beats-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockConfirmBeats).toHaveBeenCalledWith('test-project-1');
    });
  });

  describe('reject flow', () => {
    it('shows a clickable reject button in REVIEWING state', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);
      mockRejectBeats.mockResolvedValue({ status: 'REJECTED' });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Reject button should exist and be clickable in REVIEWING state
      const rejectBtn = wrapper.find('[data-testid="reject-beats-btn"]');
      expect(rejectBtn.exists()).toBe(true);
      expect(rejectBtn.text()).toContain('驳回');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CONFIRMED state
  // ═══════════════════════════════════════════════════════════

  describe('CONFIRMED state', () => {
    it('hides confirm/reject buttons when beats are confirmed', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('BEATS', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-beats-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="reject-beats-btn"]').exists()).toBe(false);
    });

    it('shows confirmed notice in CONFIRMED state', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('BEATS', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-confirmed-notice"]').exists()).toBe(true);
    });

    it('still shows beats in CONFIRMED state', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('BEATS', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beat-narrative-card"]').exists()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('shows error message when generation fails', async () => {
      mockGetBeats.mockResolvedValue([]);
      const errorMsg = 'AI 服务暂时不可用';

      // Use a different approach: trigger generate and let it fail
      mockGenerateBeats.mockRejectedValue(new Error(errorMsg));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Trigger generation
      await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 100));

      expect(wrapper.find('[data-testid="beats-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="beats-error"]').text()).toContain(errorMsg);
    });

    it('shows retry button on error', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockRejectedValue(new Error('生成失败'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="config-start-generation-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 100));

      expect(wrapper.find('[data-testid="beats-retry-btn"]').exists()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Pre-existing beats (no auto-generate)
  // ═══════════════════════════════════════════════════════════

  describe('pre-existing beats', () => {
    it('displays existing beats without auto-generating', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateBeats).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="beat-narrative-card"]').exists()).toBe(true);
    });

    it('renders the correct number of beat cards', async () => {
      mockGetBeats.mockResolvedValue(mockBeatsV2);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const cards = wrapper.findAll('[data-testid="beat-narrative-card"]');
      expect(cards.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Phase identity
  // ═══════════════════════════════════════════════════════════

  describe('phase identity', () => {
    it('renders the BEATS phase container', async () => {
      mockGetBeats.mockResolvedValue([]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));
      expect(wrapper.find('[data-testid="beats-view"]').exists()).toBe(true);
    });

    it('shows the phase title', async () => {
      mockGetBeats.mockResolvedValue([]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));
      expect(wrapper.find('[data-testid="beats-title"]').text()).toContain('细纲拆解');
    });
  });
});
