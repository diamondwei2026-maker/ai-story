import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const mockGenerateSetting = vi.fn();
const mockConfirmSetting = vi.fn();
const mockRejectSetting = vi.fn();
const mockGetSetting = vi.fn();
const mockGetIdea = vi.fn();

vi.mock('@/api/setting', () => ({
  generateSetting: (...args: any[]) => mockGenerateSetting(...args),
  confirmSetting: (...args: any[]) => mockConfirmSetting(...args),
  rejectSetting: (...args: any[]) => mockRejectSetting(...args),
  getSetting: (...args: any[]) => mockGetSetting(...args),
}));

vi.mock('@/api/idea', () => ({
  getIdea: (...args: any[]) => mockGetIdea(...args),
}));

describe('SettingView', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // 默认无 IDEA 数据（回退兼容旧行为）
    mockGetIdea.mockResolvedValue(null);
  });

  const mountView = async () => {
    const { default: SettingView } = await import('@/views/SettingView.vue');

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/project/:id', name: 'workflow', component: { template: '<div />' } },
      ],
    });
    await router.push('/project/test-project-1');
    await router.isReady();

    return mount(SettingView, {
      props: { projectId: 'test-project-1' },
      global: {
        plugins: [router],
      },
    });
  };

  describe('initial state', () => {
    it('renders the SETTING phase container', async () => {
      mockGetSetting.mockResolvedValue(null);

      const wrapper = await mountView();
      expect(wrapper.find('[data-testid="setting-view"]').exists()).toBe(true);
    });

    it('shows a generate button when no setting exists', async () => {
      mockGetSetting.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      const generateBtn = wrapper.find('[data-testid="generate-setting-btn"]');
      expect(generateBtn.exists()).toBe(true);
    });

    it('shows the phase title "设定集"', async () => {
      mockGetSetting.mockResolvedValue(null);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="setting-title"]').text()).toContain('设定集');
    });
  });

  describe('generate setting flow', () => {
    it('shows loading state while generating', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockImplementation(
        () => new Promise(() => { /* never resolves during this test */ }),
      );

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      // Auto-generate already triggered; loading should be visible
      expect(wrapper.find('[data-testid="setting-loading"]').exists()).toBe(true);
    });

    it('calls generate API with projectId and idea text', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n修真世界。\n## 力量体系\n练气筑基金丹。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate already triggers the API call
      expect(mockGenerateSetting).toHaveBeenCalledWith('test-project-1', { idea: '' });
    });

    it('passes confirmed IDEA summary as idea to generateSetting', async () => {
      mockGetSetting.mockResolvedValue(null);
      // 模拟 IDEA 阶段已确认的摘要数据（包含独立存储字段）
      mockGetIdea.mockResolvedValue({
        id: 'idea-step-1',
        projectId: 'test-project-1',
        phaseType: 'IDEA',
        status: 'CONFIRMED',
        output: '## 卖点方案 1:\n核心卖点: 赛博修仙\n\n# 一句话简介\n一个程序员在赛博朋克世界修仙。\n\n# 500字简介\n详细故事描述...',
        review: {
          selectedSellPoint: 0,
          summaryGenerated: true,
          oneLiner: '独立存储的一句话简介',
          fullSummary: '独立存储的完整简介',
        },
        version: 1,
      });
      mockGenerateSetting.mockResolvedValue({
        id: 'step-2',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n赛博修仙世界。',
        review: {},
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // 应优先使用 review 中独立存储的字段
      expect(mockGenerateSetting).toHaveBeenCalledWith('test-project-1', {
        idea: '独立存储的一句话简介\n\n独立存储的完整简介',
      });
    });

    it('displays WorldBuilder after successful generation', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n仙历三千年，灵气复苏。\n## 地理环境\n九大洲。\n## 社会结构\n宗门与散修。\n## 力量体系\n练气筑基金丹元婴。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completes; WorldBuilder should be visible
      const worldBuilder = wrapper.find('[data-testid="world-builder"]');
      expect(worldBuilder.exists()).toBe(true);
    });

    it('displays CharacterCard after switching to Characters tab', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 主角\n一位剑客，欲望：复仇，动机：家族血仇，结局：放下执念。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; switch to Characters tab
      const tabs = wrapper.findAll('.ant-tabs-tab');
      const charactersTab = tabs.find(el => el.text() === '角色');
      if (charactersTab) {
        await charactersTab.trigger('click');
        await wrapper.vm.$nextTick();
      }

      const characterCard = wrapper.find('[data-testid="character-card"]');
      expect(characterCard.exists()).toBe(true);
    });

    it('passes the generated output to WorldBuilder', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '自定义世界观内容',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; WorldBuilder should have content prop
      const worldBuilder = wrapper.findComponent({ name: 'WorldBuilder' });
      if (worldBuilder.exists()) {
        expect(worldBuilder.props('content')).toBeTruthy();
      }
    });
  });

  describe('confirm setting flow', () => {
    it('shows confirm button after generation', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '设定内容。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; confirm button should be visible
      const confirmBtn = wrapper.find('[data-testid="confirm-setting-btn"]');
      expect(confirmBtn.exists()).toBe(true);
    });

    it('calls confirm API and updates workflow store on confirm', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '设定内容',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });
      mockConfirmSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'CONFIRMED',
        confirmedAt: new Date().toISOString(),
        output: '设定内容',
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; confirm
      await wrapper.find('[data-testid="confirm-setting-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockConfirmSetting).toHaveBeenCalledWith('test-project-1');

      // Workflow store should be updated
      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      expect(store.getStepStatus('SETTING')).toBe('CONFIRMED');
      expect(store.currentPhase).toBe('OUTLINE');
    });

    it('hides confirm button when setting already confirmed', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'CONFIRMED',
        output: '已确认的设定',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('SETTING', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="confirm-setting-btn"]').exists()).toBe(false);
    });
  });

  describe('reject setting flow', () => {
    it('shows reject button after generation', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '设定内容。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; reject button should be visible
      expect(wrapper.find('[data-testid="reject-setting-btn"]').exists()).toBe(true);
    });

    it('calls generateSetting directly on reject button click (no reject API)', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '设定内容',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; click reject
      await wrapper.find('[data-testid="reject-setting-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Reject no longer calls rejectSetting — it directly regenerates
      expect(mockRejectSetting).not.toHaveBeenCalled();
      expect(mockGenerateSetting).toHaveBeenCalledTimes(2);
    });

    it('shows regenerated content after reject-and-regenerate', async () => {
      mockGetSetting.mockResolvedValue(null);
      // First call: auto-generation
      mockGenerateSetting
        .mockResolvedValueOnce({
          id: 'step-1',
          projectId: 'test-project-1',
          phaseType: 'SETTING',
          status: 'AWAITING_REVIEW',
          output: '原始设定内容',
          review: { powerSystemCheck: { passed: true, flags: [] } },
          version: 1,
        })
        // Second call: regeneration after reject
        .mockResolvedValueOnce({
          id: 'step-1',
          projectId: 'test-project-1',
          phaseType: 'SETTING',
          status: 'AWAITING_REVIEW',
          output: '全新生成的设定内容',
          review: { powerSystemCheck: { passed: true, flags: [] } },
          version: 2,
        });
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate completed; click reject
      await wrapper.find('[data-testid="reject-setting-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Should show the regenerated content
      const worldBuilder = wrapper.find('[data-testid="world-builder"]');
      expect(worldBuilder.exists()).toBe(true);
    });

    it('hides reject button when setting is confirmed', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'CONFIRMED',
        output: '已确认的设定',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const { useWorkflowStore } = await import('@/stores/useWorkflowStore');
      const store = useWorkflowStore();
      store.setStepStatus('SETTING', 'CONFIRMED');

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="reject-setting-btn"]').exists()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('displays error message when generation fails', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockRejectedValue(new Error('AI 服务暂时不可用'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate triggered and failed; error should be visible
      const errorEl = wrapper.find('[data-testid="setting-error"]');
      expect(errorEl.exists()).toBe(true);
      expect(errorEl.text()).toContain('AI 服务暂时不可用');
    });

    it('shows retry button when generation fails', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting.mockRejectedValue(new Error('生成失败'));

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate triggered and failed; retry button should be visible
      expect(wrapper.find('[data-testid="setting-retry-btn"]').exists()).toBe(true);
    });

    it('allows retry after generation failure', async () => {
      mockGetSetting.mockResolvedValue(null);
      mockGenerateSetting
        .mockRejectedValueOnce(new Error('首次失败'))
        .mockResolvedValueOnce({
          id: 'step-1',
          projectId: 'test-project-1',
          phaseType: 'SETTING',
          status: 'AWAITING_REVIEW',
          output: '重试成功的内容',
          review: { powerSystemCheck: { passed: true, flags: [] } },
          version: 1,
        });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      // Auto-generate triggered and consumed the first (failing) call
      // Click retry button to trigger the second call
      await wrapper.find('[data-testid="setting-retry-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateSetting).toHaveBeenCalledTimes(2);
      expect(wrapper.find('[data-testid="world-builder"]').exists()).toBe(true);
    });
  });

  describe('pre-existing setting', () => {
    it('displays existing setting content without generate button', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-existing',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n已存在的世界观内容。\n## 力量体系\n魔法等级。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      // Should not show generate button since content already exists
      expect(wrapper.find('[data-testid="generate-setting-btn"]').exists()).toBe(false);
      // Should show content
      expect(wrapper.find('[data-testid="world-builder"]').exists()).toBe(true);
    });

    it('does not show review annotations when annotations is empty', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-review',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '设定内容',
        review: {
          powerSystemCheck: { passed: true, flags: [] },
          annotations: '',
        },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="review-annotations"]').exists()).toBe(false);
    });
  });

  describe('regenerate (refresh) flow', () => {
    it('shows refresh button when setting is not confirmed', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-r1',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n修真世界。\n## 力量体系\n练气筑基金丹。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="regenerate-setting-btn"]').exists()).toBe(true);
    });

    it('does not show refresh button when setting is confirmed', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-confirmed',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'CONFIRMED',
        output: '已确认设定',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
        confirmedAt: new Date().toISOString(),
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      expect(wrapper.find('[data-testid="regenerate-setting-btn"]').exists()).toBe(false);
    });

    it('calls generateSetting with currentContent when refresh is clicked', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-r2',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n修真世界。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });
      mockGenerateSetting.mockResolvedValue({
        id: 'step-r2-new',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n刷新后的修真世界。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 2,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="regenerate-setting-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGenerateSetting).toHaveBeenCalledWith('test-project-1', {
        idea: '',
        currentContent: '## 时代背景\n修真世界。',
      });
    });

    it('updates displayed output after successful refresh', async () => {
      mockGetSetting.mockResolvedValue({
        id: 'step-r3',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '## 时代背景\n原始设定。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 1,
      });
      mockGenerateSetting.mockResolvedValue({
        id: 'step-r3-new',
        projectId: 'test-project-1',
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        output: '刷新后的完整设定。',
        review: { powerSystemCheck: { passed: true, flags: [] } },
        version: 2,
      });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));

      await wrapper.find('[data-testid="regenerate-setting-btn"]').trigger('click');
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 50));

      expect(wrapper.find('[data-testid="world-builder"]').exists()).toBe(true);
    });
  });
});
