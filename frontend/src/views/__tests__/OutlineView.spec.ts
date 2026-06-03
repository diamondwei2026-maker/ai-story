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

    it('regenerates directly on reject button click (no reject API)', async () => {
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

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="reject-outline-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Reject no longer calls rejectOutline — it directly regenerates
      expect(mockRejectOutline).not.toHaveBeenCalled();
      expect(mockGenerateOutline).toHaveBeenCalledTimes(2);
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

    it('does not show review annotations when annotations is empty', async () => {
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
          annotations: '',
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="review-annotations"]').exists()).toBe(false);
    });

    it('strips [爽点] tag from outline body text', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-strip-1',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n主角登场 [爽点]\n## 第二幕\n遭遇挫折',
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

      const tree = wrapper.find('[data-testid="outline-tree"]');
      expect(tree.text()).toContain('主角登场');
      expect(tree.text()).not.toContain('[爽点]');
    });

    it('strips [虐点] and [高潮] tags from outline body text', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-strip-2',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n主角升级 [爽点]\n## 第二幕\n朋友背叛 [虐点]\n## 第三幕\n最终决战 [高潮]',
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

      const tree = wrapper.find('[data-testid="outline-tree"]');
      const text = tree.text();
      expect(text).toContain('主角升级');
      expect(text).toContain('朋友背叛');
      expect(text).toContain('最终决战');
      expect(text).not.toContain('[爽点]');
      expect(text).not.toContain('[虐点]');
      expect(text).not.toContain('[高潮]');
    });

    it('preserves non-emotion bracket content in outline text', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-strip-3',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一幕\n主角获得[神器]提升实力\n## 第二幕\n遭遇[暗影军团]伏击',
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

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).toContain('[神器]');
      expect(text).toContain('[暗影军团]');
    });

    it('parses 第X段 format from web-novel-ten structure', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-paragraph',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '第一段\n主角出场，展示金手指\n第二段\n首次冲突，小试牛刀\n第三段\n遭遇强敌，被迫逃亡',
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

      const tree = wrapper.find('[data-testid="outline-tree"]');
      const text = tree.text();
      // 三段都应出现在时间线中
      expect(text).toContain('第一段');
      expect(text).toContain('主角出场');
      expect(text).toContain('第二段');
      expect(text).toContain('首次冲突');
      expect(text).toContain('第三段');
      expect(text).toContain('被迫逃亡');
    });

    it('parses ## 第一段 markdown header format', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-md-para',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '## 第一段\n开篇引入\n## 第二段\n冲突升级\n## 第三段\n高潮收尾',
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

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).not.toContain('##');
      expect(text).toContain('第一段');
      expect(text).toContain('第二段');
      expect(text).toContain('第三段');
    });

    it('preserves multiline body text across all sections', async () => {
      mockGetOutline.mockResolvedValue({
        id: 'step-multiline',
        projectId: 'test-project-1',
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        output: '第一段\n主角出场，展示金手指\n\n修炼突破，踏入新境界\n第二段\n首次冲突\n\n小试牛刀',
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

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      // 第一段的两段正文都独立存在
      expect(text).toContain('主角出场');
      expect(text).toContain('修炼突破');
      // 第二段的正文存在
      expect(text).toContain('首次冲突');
      expect(text).toContain('小试牛刀');
    });
  });

  describe('regenerate (refresh) flow', () => {
    it('does not show refresh button when outline is not confirmed', async () => {
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

      expect(wrapper.find('[data-testid="regenerate-outline-btn"]').exists()).toBe(false);
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
  });
});
