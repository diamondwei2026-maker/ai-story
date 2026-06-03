import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const mockGetBeats = vi.fn();
const mockGenerateBeats = vi.fn();
const mockConfirmBeats = vi.fn();
const mockRejectBeats = vi.fn();

vi.mock('@/api/beats', () => ({
  getBeats: (...args: any[]) => mockGetBeats(...args),
  generateBeats: (...args: any[]) => mockGenerateBeats(...args),
  confirmBeats: (...args: any[]) => mockConfirmBeats(...args),
  rejectBeats: (...args: any[]) => mockRejectBeats(...args),
}));

const mockGetOutline = vi.fn();
vi.mock('@/api/outline', () => ({
  getOutline: (...args: any[]) => mockGetOutline(...args),
}));

const mockOutline = {
  id: 'step-outline', projectId: 'proj-1', phaseType: 'OUTLINE',
  status: 'CONFIRMED', output: '大纲内容测试', review: {}, version: 1,
};

const mockBeats = [
  {
    id: 'beat-1', projectId: 'proj-1', chapterNumber: 1,
    plan: { conflictPoint: '冲突A', hookPresets: ['钩子1', '钩子2'] },
    targetWordCount: 3000, hookCount: 2, isClimax: false,
    useR1: true, status: 'PENDING',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    id: 'beat-2', projectId: 'proj-1', chapterNumber: 2,
    plan: { conflictPoint: '冲突B', hookPresets: ['钩子3'] },
    targetWordCount: 3500, hookCount: 1, isClimax: false,
    useR1: false, status: 'PENDING',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    id: 'beat-3', projectId: 'proj-1', chapterNumber: 3,
    plan: { conflictPoint: '冲突C', hookPresets: ['钩子4', '钩子5', '钩子6'] },
    targetWordCount: 4000, hookCount: 3, isClimax: true,
    useR1: true, status: 'PENDING',
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
];

describe('BeatsView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // Default: outline available
    mockGetOutline.mockResolvedValue(mockOutline);
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

  describe('initial state', () => {
    it('renders the BEATS phase container', async () => {
      mockGetBeats.mockResolvedValue([]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="beats-view"]').exists()).toBe(true);
    });

    it('shows the phase title', async () => {
      mockGetBeats.mockResolvedValue([]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="beats-title"]').text()).toContain('细纲拆解');
    });
  });

  describe('auto-generate on mount', () => {
    it('triggers generateBeats with outline text when no existing beats', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateBeats).toHaveBeenCalledWith('test-project-1', {
        outline: '大纲内容测试', currentContent: '',
      });
    });

    it('shows loading state while generating', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="beats-loading"]').exists()).toBe(true);
    });
  });

  describe('after generation', () => {
    it('shows BeatList after successful generation', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beat-list"]').exists()).toBe(true);
    });

    it('shows HookDensityChart after successful generation', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="hook-density-chart"]').exists()).toBe(true);
    });

    it('shows confirm and reject buttons after generation', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-beats-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="reject-beats-btn"]').exists()).toBe(true);
    });
  });

  describe('confirm flow', () => {
    it('calls confirmBeats API and updates workflow store', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);
      mockConfirmBeats.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1',
        phaseType: 'BEATS', status: 'CONFIRMED',
        output: '', review: { beatCount: 3 }, version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="confirm-beats-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockConfirmBeats).toHaveBeenCalledWith('test-project-1');

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      expect(store.getStepStatus('BEATS')).toBe('CONFIRMED');
      expect(store.currentPhase).toBe('DRAFTING');
    });
  });

  describe('reject flow', () => {
    it('regenerates directly on reject (no reject API call)', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      mockGenerateBeats.mockClear();
      mockGenerateBeats.mockResolvedValue(mockBeats);

      await wrapper.find('[data-testid="reject-beats-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockRejectBeats).not.toHaveBeenCalled();
      expect(mockGenerateBeats).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('shows error message when generation fails', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockRejectedValue(new Error('AI 服务暂时不可用'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="beats-error"]').text()).toContain('AI 服务暂时不可用');
    });

    it('shows retry button on error', async () => {
      mockGetBeats.mockResolvedValue([]);
      mockGenerateBeats.mockRejectedValue(new Error('生成失败'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="beats-retry-btn"]').exists()).toBe(true);
    });
  });

  describe('pre-existing beats', () => {
    it('displays existing beats without auto-generating', async () => {
      mockGetBeats.mockResolvedValue(mockBeats);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateBeats).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="beat-list"]').exists()).toBe(true);
    });
  });

  describe('confirmed state', () => {
    it('hides confirm/reject buttons when beats are confirmed', async () => {
      mockGetBeats.mockResolvedValue(mockBeats);

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('BEATS', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-beats-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="reject-beats-btn"]').exists()).toBe(false);
    });
  });
});
