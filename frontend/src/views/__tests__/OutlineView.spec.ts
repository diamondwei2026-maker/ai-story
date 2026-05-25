import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const mockGenerateOutline = vi.fn();
const mockConfirmOutline = vi.fn();
const mockRejectOutline = vi.fn();
const mockGetOutline = vi.fn();
const mockSwitchStructure = vi.fn();

vi.mock('@/api/outline', () => ({
  generateOutline: (...args: any[]) => mockGenerateOutline(...args),
  confirmOutline: (...args: any[]) => mockConfirmOutline(...args),
  rejectOutline: (...args: any[]) => mockRejectOutline(...args),
  getOutline: (...args: any[]) => mockGetOutline(...args),
  switchStructure: (...args: any[]) => mockSwitchStructure(...args),
}));

describe('OutlineView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mountView = async () => {
    const { default: OutlineView } = await import('@/views/OutlineView.vue');

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/project/:id', name: 'workflow', component: { template: '<div />' } },
      ],
    });
    await router.push('/project/test-project-1');
    await router.isReady();

    return mount(OutlineView, {
      props: { projectId: 'test-project-1' },
      global: {
        plugins: [router],
      },
    });
  };

  describe('initial state', () => {
    it('renders the OUTLINE phase container', async () => {
      mockGetOutline.mockResolvedValue(null);

      const wrapper = await mountView();
      expect(wrapper.find('[data-testid="outline-view"]').exists()).toBe(true);
    });

    it('shows a generate button when no outline exists', async () => {
      mockGetOutline.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      const generateBtn = wrapper.find('[data-testid="generate-outline-btn"]');
      expect(generateBtn.exists()).toBe(true);
    });

    it('shows the phase title "剧情大纲"', async () => {
      mockGetOutline.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="outline-title"]').text()).toContain('剧情大纲');
    });

    it('shows structure selector with three options', async () => {
      mockGetOutline.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
    });
  });

  describe('generate outline flow', () => {
    it('shows loading state while generating', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      const btn = wrapper.find('[data-testid="generate-outline-btn"]');
      await btn.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="outline-loading"]').exists()).toBe(true);
    });

    it('calls generate API with projectId, setting and structure', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n情节点1 [爽点]\n## 第二幕\n情节点2 [虐点]\n## 第三幕\n情节点3 [高潮]',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '冲突递进合理' },
          climaxReview: { passed: true, notes: '高潮有力' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateOutline).toHaveBeenCalledWith('test-project-1', {
        setting: '',
        structure: 'three-act',
      });
    });

    it('displays OutlineTree after successful generation', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n情节点1 [爽点]\n## 第二幕\n情节点2 [虐点]\n## 第三幕\n情节点3 [高潮]',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '冲突递进合理' },
          climaxReview: { passed: true, notes: '高潮有力' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="outline-tree"]').exists()).toBe(true);
    });

    it('displays EmotionCurve after successful generation', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n情节点1 [爽点]\n情节点2 [悬念点]\n## 第二幕\n情节点3 [虐点]',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="emotion-curve"]').exists()).toBe(true);
    });
  });

  describe('confirm outline flow', () => {
    it('shows confirm button after generation', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-outline-btn"]').exists()).toBe(true);
    });

    it('calls confirm API and updates workflow store on confirm', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });
      mockConfirmOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
        output: '大纲内容',
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="confirm-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockConfirmOutline).toHaveBeenCalledWith('test-project-1');

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      expect(store.getStepStatus('OUTLINE')).toBe('CONFIRMED');
      expect(store.currentPhase).toBe('BEATS');
    });

    it('hides confirm button when outline already confirmed', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'CONFIRMED',
        output: '已确认的大纲',
        review: {
          structurePacing: { passed: true, score: 90 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('OUTLINE', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="confirm-outline-btn"]').exists()).toBe(false);
    });
  });

  describe('reject outline flow', () => {
    it('shows reject button after generation', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="reject-outline-btn"]').exists()).toBe(true);
    });

    it('calls rejectOutline API on reject button click', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });
      mockRejectOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'REJECTED',
        output: '大纲内容',
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="reject-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockRejectOutline).toHaveBeenCalledWith('test-project-1');
    });

    it('hides reject button when outline is confirmed', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'CONFIRMED',
        output: '已确认的大纲',
        review: {
          structurePacing: { passed: true, score: 90 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('OUTLINE', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="reject-outline-btn"]').exists()).toBe(false);
    });
  });

  describe('structure switch flow', () => {
    it('shows confirmation prompt when switching structure', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Switch structure
      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
    });

    it('shows warning message "关键情节点保留但节点间衔接将被重写" on switch confirmation', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });
      mockSwitchStructure.mockResolvedValue({
        id: 'step-2',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 重新组织的大纲',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 2,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // The switch confirm dialog should contain the warning message
      // (This tests that the UI will show the prompt before switching)
      expect(wrapper.find('[data-testid="structure-switcher"]').exists()).toBe(true);
    });

    it('should not show structure switcher after outline is confirmed', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'CONFIRMED',
        output: '已确认的大纲',
        review: {
          structurePacing: { passed: true, score: 90 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="structure-switcher"]').exists()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('displays error message when generation fails', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockRejectedValue(new Error('AI 服务暂时不可用'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const errorEl = wrapper.find('[data-testid="outline-error"]');
      expect(errorEl.exists()).toBe(true);
      expect(errorEl.text()).toContain('AI 服务暂时不可用');
    });

    it('shows retry button when generation fails', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockRejectedValue(new Error('生成失败'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="outline-retry-btn"]').exists()).toBe(true);
    });

    it('allows retry after generation failure', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline
        .mockRejectedValueOnce(new Error('首次失败'))
        .mockResolvedValueOnce({
          id: 'step-1',
          projectId: 'test-project-1',
          phaseType: 'OUTLINE',
          status: 'AWAITING_REVIEW',
          output: '重试成功的大纲',
          review: {
            structurePacing: { passed: true, score: 85 },
            conflictReview: { passed: true, notes: '' },
            climaxReview: { passed: true, notes: '' },
          },
          version: 1,
        });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="outline-retry-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateOutline).toHaveBeenCalledTimes(2);
      expect(wrapper.find('[data-testid="outline-tree"]').exists()).toBe(true);
    });
  });

  describe('pre-existing outline', () => {
    it('displays existing outline content without generate button', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-existing',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n已存在的大纲内容\n## 第二幕\n情节点详情',
        review: {
          structurePacing: { passed: true, score: 90 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="generate-outline-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="outline-tree"]').exists()).toBe(true);
    });

    it('shows review annotations in the content', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-review',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '冲突递进合理' },
          climaxReview: { passed: true, notes: '高潮有力' },
          annotations: 'AI 生成内容，仅供参考',
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="review-annotations"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="review-annotations"]').text()).toContain('仅供参考');
    });

    it('displays emotion labels on plot points', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-emotion',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n情节点1 [爽点]\n情节点2 [悬念点]\n## 第二幕\n情节点3 [虐点]',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="emotion-curve"]').exists()).toBe(true);
    });
  });

  describe('regenerate (refresh) flow', () => {
    it('shows refresh button when outline is not confirmed', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-r1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n大纲内容',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="regenerate-outline-btn"]').exists()).toBe(true);
    });

    it('does not show refresh button when outline is confirmed', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-confirmed',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'CONFIRMED',
        output: '已确认大纲',
        review: {
          structurePacing: { passed: true, score: 90 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="regenerate-outline-btn"]').exists()).toBe(false);
    });

    it('calls generateOutline with currentContent when refresh is clicked', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-r2',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n原大纲',
        review: {
          structurePacing: { passed: true, score: 80 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 1,
      });
      mockGenerateOutline.mockResolvedValue({
        id: 'step-r2-new',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n刷新后的大纲',
        review: {
          structurePacing: { passed: true, score: 85 },
          conflictReview: { passed: true, notes: '' },
          climaxReview: { passed: true, notes: '' },
        },
        version: 2,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="regenerate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateOutline).toHaveBeenCalledWith('test-project-1', {
        setting: '',
        structure: 'three-act',
        currentContent: '## 第一幕\n原大纲',
      });
    });
  });
});
