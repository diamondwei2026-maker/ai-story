import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const mockGenerateIdea = vi.fn();
const mockGenerateIdeaSummary = vi.fn();
const mockConfirmIdea = vi.fn();
const mockRejectIdea = vi.fn();
const mockGetIdea = vi.fn();

vi.mock('@/api/idea', () => ({
  generateIdea: (...args: any[]) => mockGenerateIdea(...args),
  generateIdeaSummary: (...args: any[]) => mockGenerateIdeaSummary(...args),
  confirmIdea: (...args: any[]) => mockConfirmIdea(...args),
  rejectIdea: (...args: any[]) => mockRejectIdea(...args),
  getIdea: (...args: any[]) => mockGetIdea(...args),
}));

describe('IdeaView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mountView = async () => {
    const { default: IdeaView } = await import('@/views/IdeaView.vue');

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/project/:id', name: 'workflow', component: { template: '<div />' } },
      ],
    });
    await router.push('/project/test-project-1');
    await router.isReady();

    return mount(IdeaView, {
      props: { projectId: 'test-project-1' },
      global: {
        plugins: [router],
      },
    });
  };

  describe('initial state', () => {
    it('renders the IDEA phase container', async () => {
      mockGetIdea.mockResolvedValue(null);

      const wrapper = await mountView();
      expect(wrapper.find('[data-testid="idea-view"]').exists()).toBe(true);
    });

    it('shows IdeaInput when no idea step exists', async () => {
      mockGetIdea.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="idea-input"]').exists()).toBe(true);
    });

    it('shows the phase title "灵感提取"', async () => {
      mockGetIdea.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="idea-title"]').text()).toContain('灵感提取');
    });

    it('shows a generate button when no idea exists', async () => {
      mockGetIdea.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="generate-idea-btn"]').exists()).toBe(true);
    });
  });

  describe('generate idea flow', () => {
    it('shows loading state while generating sell points', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="idea-loading"]').exists()).toBe(true);
    });

    it('calls generateIdea API with projectId and idea text', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      // Type in idea text first
      const textarea = wrapper.find('[data-testid="idea-textarea"]');
      await textarea.setValue('一个医生重生到星际时代的故事');

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateIdea).toHaveBeenCalledWith('test-project-1', {
        idea: '一个医生重生到星际时代的故事',
      });
    });

    it('displays SellPointSelector after successful generation', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="sellpoint-selector"]').exists()).toBe(true);
    });

    it('does not show review annotations when annotations is empty', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const reviewEl = wrapper.find('[data-testid="review-annotations"]');
      expect(reviewEl.exists()).toBe(false);
    });
  });

  describe('regenerate idea flow', () => {
    it('allows regeneration with feedback', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 新方案\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      // First generate
      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Type feedback and regenerate
      const feedbackInput = wrapper.find('[data-testid="feedback-input"]');
      await feedbackInput.setValue('希望更偏向轻松搞笑风格');

      await wrapper.find('[data-testid="regenerate-sellpoints-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateIdea).toHaveBeenCalledWith('test-project-1', {
        idea: '',
        feedback: '希望更偏向轻松搞笑风格',
      });
    });
  });

  describe('generate summary flow', () => {
    it('shows generate summary button after selecting a sell point', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Select a sell point
      const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
      await cards[0].trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="generate-summary-btn"]').exists()).toBe(true);
    });

    it('displays SummaryCard after generating summary', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });
      mockGenerateIdeaSummary.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...',
        review: {
          oneLiner: '女医生重生星际。',
          fullSummary: '详细简介内容...',
          summaryGenerated: true,
          selectedSellPoint: 0,
          complianceCheck: { passed: true },
          annotations: '',
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      // Generate sell points
      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Select and generate summary
      const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
      await cards[0].trigger('click');
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="generate-summary-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="summary-card"]').exists()).toBe(true);
    });

    it('calls generateIdeaSummary with selectedSellPoint', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: ...\n## 卖点方案 2: ...\n## 卖点方案 3: ...',
        review: { complianceCheck: { passed: true }, annotations: '' },
        version: 1,
      });
      mockGenerateIdeaSummary.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: ...\n## 卖点方案 2: ...\n## 卖点方案 3: ...',
        review: {
          oneLiner: '女医生重生星际。',
          fullSummary: '详细简介内容...',
          summaryGenerated: true,
          selectedSellPoint: 1,
        },
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Select the second sell point
      const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
      await cards[1].trigger('click');
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="generate-summary-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateIdeaSummary).toHaveBeenCalledWith('test-project-1', {
        selectedSellPoint: 1,
      });
    });
  });

  describe('confirm idea flow', () => {
    it('shows confirm button after summary is generated', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: { complianceCheck: { passed: true }, annotations: '' }, version: 1,
      });
      mockGenerateIdeaSummary.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: {
          oneLiner: '女医生重生星际。',
          fullSummary: '详细简介内容...',
          summaryGenerated: true,
          selectedSellPoint: 0,
        },
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
      await cards[0].trigger('click');
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="generate-summary-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="confirm-idea-btn"]').exists()).toBe(true);
    });

    it('calls confirmIdea API and updates workflow store', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: { complianceCheck: { passed: true }, annotations: '' }, version: 1,
      });
      mockGenerateIdeaSummary.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: {
          oneLiner: '女医生重生星际。',
          fullSummary: '详细简介内容...',
          summaryGenerated: true,
          selectedSellPoint: 0,
        },
      });
      mockConfirmIdea.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'CONFIRMED', confirmedAt: new Date().toISOString(),
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const cards = wrapper.findAll('[data-testid="market-analysis-card"]');
      await cards[0].trigger('click');
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="generate-summary-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      await wrapper.find('[data-testid="confirm-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockConfirmIdea).toHaveBeenCalledWith('test-project-1', {
        selectedSellPoint: 0,
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      expect(store.getStepStatus('IDEA')).toBe('CONFIRMED');
      expect(store.currentPhase).toBe('SETTING');
    });

    it('hides confirm button when idea already confirmed', async () => {
      mockGetIdea.mockResolvedValue({
        id: 'step-confirmed', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'CONFIRMED', output: '已确认的卖点',
        review: { selectedSellPoint: 0 }, version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('IDEA', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="confirm-idea-btn"]').exists()).toBe(false);
    });
  });

  describe('reject idea flow', () => {
    it('shows regenerate button after generation', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: { complianceCheck: { passed: true }, annotations: '' }, version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="regenerate-sellpoints-btn"]').exists()).toBe(true);
    });

    it('regenerates via generateIdea when clicking regenerate without feedback', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockResolvedValue({
        id: 'step-1', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW', output: '## 卖点方案 1: ...',
        review: { complianceCheck: { passed: true }, annotations: '' }, version: 1,
      });
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      mockGenerateIdea.mockClear();
      await wrapper.find('[data-testid="regenerate-sellpoints-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateIdea).toHaveBeenCalledWith(
        'test-project-1',
        { idea: '', feedback: '' },
      );
    });
  });

  describe('error handling', () => {
    it('displays error message when generation fails', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockRejectedValue(new Error('AI 服务暂时不可用'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      const errorEl = wrapper.find('[data-testid="idea-error"]');
      expect(errorEl.exists()).toBe(true);
      expect(errorEl.text()).toContain('AI 服务暂时不可用');
    });

    it('shows retry button when generation fails', async () => {
      mockGetIdea.mockResolvedValue(null);
      mockGenerateIdea.mockRejectedValue(new Error('生成失败'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="generate-idea-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="idea-retry-btn"]').exists()).toBe(true);
    });
  });

  describe('pre-existing idea', () => {
    it('displays existing sell points without generate button', async () => {
      mockGetIdea.mockResolvedValue({
        id: 'step-existing', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: 星际医妃风华录\n...\n## 卖点方案 2: ...\n## 卖点方案 3: ...',
        review: { complianceCheck: { passed: true }, annotations: '' }, version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="generate-idea-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="sellpoint-selector"]').exists()).toBe(true);
    });

    it('displays existing summary when step has summary content', async () => {
      mockGetIdea.mockResolvedValue({
        id: 'step-with-summary', projectId: 'test-project-1', phaseType: 'IDEA',
        status: 'AWAITING_REVIEW',
        output: '## 卖点方案 1: ...\n## 卖点方案 2: ...\n## 卖点方案 3: ...',
        review: {
          oneLiner: '女医生重生星际。',
          fullSummary: '详细简介内容...',
          summaryGenerated: true,
          complianceCheck: { passed: true },
          annotations: '',
        }, version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="summary-card"]').exists()).toBe(true);
    });
  });
});
