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

// ─── test helpers ──────────────────────────────────────────

interface OutlineDataOverrides {
  id?: string;
  status?: string;
  input?: string;
  output?: string;
  review?: Record<string, unknown>;
  version?: number;
  confirmedAt?: string | null;
}

/** Build mock StepDataResponse with sensible defaults for outline tests */
function makeOutlineData(overrides: OutlineDataOverrides = {}) {
  return {
    id: overrides.id ?? 'step-test',
    projectId: 'test-project-1',
    phaseType: 'OUTLINE' as const,
    status: overrides.status ?? 'AWAITING_REVIEW',
    input: overrides.input ?? 'structure: three-act\nsetting:',
    output: overrides.output ?? '## 第一幕\n开场\n## 第二幕\n发展\n## 第三幕\n结局',
    review: overrides.review ?? {
      structurePacing: { passed: true, score: 80 },
      conflictReview: { passed: true, notes: '' },
      climaxReview: { passed: true, notes: '' },
    },
    version: overrides.version ?? 1,
    confirmedAt: overrides.confirmedAt ?? null,
  };
}

/** Flush async work so onMounted / watchers settle before assertions */
async function flushAsync(wrapper: ReturnType<typeof mount>, ms = 50) {
  await wrapper.vm.$nextTick();
  await new Promise((r) => setTimeout(r, ms));
  await wrapper.vm.$nextTick();
}

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

  describe('structure switcher — visibility', () => {
    it('shows structure selector when outline data exists and is not confirmed', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        output: '## 第一幕\n开场引入\n## 第二幕\n冲突升级\n## 第三幕\n结局收尾',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
    });

    it('structure selector contains exactly three options: 三幕式, 网文十段, 四幕八段', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({ output: '## 大纲内容' }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
      const switcherText = switcher.text();
      expect(switcherText).toContain('三幕式');
      expect(switcherText).toContain('网文十段');
      expect(switcherText).toContain('四幕八段');
    });

    it('hides structure selector when outline is confirmed', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        status: 'CONFIRMED',
        output: '已确认的大纲',
        confirmedAt: new Date().toISOString(),
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      expect(wrapper.find('[data-testid="structure-switcher"]').exists()).toBe(false);
    });
  });

  describe('structure switcher — default value from outline', () => {
    it('defaults to web-novel-ten when no existing outline (first load)', async () => {
      mockGetOutline.mockResolvedValue(null);
      mockGenerateOutline.mockResolvedValue(makeOutlineData({ output: '## 大纲内容' }));

      const wrapper = await mountView();
      await flushAsync(wrapper, 200);

      // Auto-generate watcher fires; verify structure is three-act
      const calls = mockGenerateOutline.mock.calls;
      const relevantCall = calls.find((c: any[]) => c[0] === 'test-project-1');
      if (relevantCall) {
        expect(relevantCall[1].structure).toBe('web-novel-ten');
      }
    });

    it('reads initial structure from existing outline input field (three-act)', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: three-act\nsetting: fantasy world',
        output: '## 第一幕\n开端\n## 第二幕\n发展\n## 第三幕\n结局',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
      expect(switcher.text()).toContain('三幕式');
    });

    it('reads initial structure from existing outline input field (web-novel-ten)', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: web-novel-ten\nsetting: fantasy world',
        output: '第一段\n开局\n第二段\n发展\n第三段\n转折\n第四段\n高潮\n第五段\n收尾',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
      expect(switcher.text()).toContain('网文十段');
    });

    it('reads initial structure from existing outline input field (four-act-eight)', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: four-act-eight\nsetting: fantasy world',
        output: '## 第一幕\n建置\n## 第二幕\n发展\n## 第三幕\n高潮\n## 第四幕\n收束',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);
      expect(switcher.text()).toContain('四幕八段');
    });
  });

  describe('structure switch — confirmation modal', () => {
    it('opens an Ant Design confirmation modal (not native confirm) when selector changes', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());

      const confirmSpy = vi.spyOn(window, 'confirm');

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const switcher = wrapper.find('[data-testid="structure-switcher"]');
      expect(switcher.exists()).toBe(true);

      // Trigger structure change
      const segmented = switcher.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'web-novel-ten');
        await flushAsync(wrapper);
      }

      // Native confirm should NOT have been called
      expect(confirmSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('shows a confirmation modal with warning text about key plot points preservation', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());

      const wrapper = await mountView();
      await flushAsync(wrapper);

      // Trigger structure change
      const segmented = wrapper.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'web-novel-ten');
        await flushAsync(wrapper);
      }

      const modal = wrapper.find('[data-testid="structure-switch-modal"]');
      expect(modal.exists()).toBe(true);
      expect(modal.text()).toContain('关键情节点');
    });

    it('canceling the confirmation modal does NOT call switchStructure API', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());
      mockSwitchStructure.mockResolvedValue(makeOutlineData({
        output: '## 重新组织的大纲',
        version: 2,
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      // Trigger structure change
      const segmented = wrapper.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'web-novel-ten');
        await flushAsync(wrapper);
      }

      const cancelBtn = wrapper.find('[data-testid="structure-switch-cancel"]');
      if (cancelBtn.exists()) {
        await cancelBtn.trigger('click');
        await flushAsync(wrapper);
      }

      expect(mockSwitchStructure).not.toHaveBeenCalled();
    });

    it('confirming the modal calls switchStructure API and updates outlineData', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());
      mockSwitchStructure.mockResolvedValue(makeOutlineData({
        input: 'structure: four-act-eight\nkeyPoints preserved: ...',
        output: '## 第一幕\n重新组织\n## 第二幕\n发展\n## 第三幕\n高潮\n## 第四幕\n收束',
        version: 2,
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      // Trigger structure change to four-act-eight
      const segmented = wrapper.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'four-act-eight');
        await flushAsync(wrapper);
      }

      // Click confirm in the modal
      const confirmBtn = wrapper.find('[data-testid="structure-switch-confirm"]');
      if (confirmBtn.exists()) {
        await confirmBtn.trigger('click');
        await flushAsync(wrapper);
      }

      expect(mockSwitchStructure).toHaveBeenCalledWith('test-project-1', 'four-act-eight');
    });

    it('shows loading state during structure switch', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());
      // Never-resolving promise to keep loading state
      mockSwitchStructure.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const segmented = wrapper.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'four-act-eight');
        await flushAsync(wrapper);
      }

      const confirmBtn = wrapper.find('[data-testid="structure-switch-confirm"]');
      if (confirmBtn.exists()) {
        await confirmBtn.trigger('click');
        await flushAsync(wrapper);
      }

      expect(wrapper.find('[data-testid="outline-loading"]').exists()).toBe(true);
    });

    it('shows error when structure switch fails', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData());
      mockSwitchStructure.mockRejectedValue(new Error('切换结构失败，请重试'));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const segmented = wrapper.findComponent({ name: 'ASegmented' });
      if (segmented.exists()) {
        await segmented.vm.$emit('change', 'four-act-eight');
        await flushAsync(wrapper);
      }

      const confirmBtn = wrapper.find('[data-testid="structure-switch-confirm"]');
      if (confirmBtn.exists()) {
        await confirmBtn.trigger('click');
        await flushAsync(wrapper);
      }

      const errorEl = wrapper.find('[data-testid="outline-error"]');
      expect(errorEl.exists()).toBe(true);
      expect(errorEl.text()).toContain('切换结构失败');
    });
  });

  describe('outline parser — all three structure formats', () => {
    it('parses 三幕式 (three-act) format correctly', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        output: '## 第一幕\n建置与引入\n## 第二幕\n冲突与对抗\n## 第三幕\n解决与收束',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).toContain('第一幕');
      expect(text).toContain('建置与引入');
      expect(text).toContain('第二幕');
      expect(text).toContain('冲突与对抗');
      expect(text).toContain('第三幕');
      expect(text).toContain('解决与收束');
      expect(text).not.toContain('##');
    });

    it('parses 网文十段 (web-novel-ten) format correctly', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: web-novel-ten\nsetting:',
        output: '第一段\n主角出场\n第二段\n获得金手指\n第三段\n首次冲突\n第四段\n实力提升\n第五段\n遭遇强敌\n第六段\n绝境突破\n第七段\n反转局势\n第八段\n真正敌人\n第九段\n最终对决\n第十段\n结局收尾',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).toContain('第一段');
      expect(text).toContain('主角出场');
      expect(text).toContain('第五段');
      expect(text).toContain('遭遇强敌');
      expect(text).toContain('第十段');
      expect(text).toContain('结局收尾');
    });

    it('parses 四幕八段 (four-act-eight) format correctly', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: four-act-eight\nsetting:',
        output: '## 第一幕\n建置\n## 第二幕\n发展\n## 第三幕\n高潮\n## 第四幕\n收束',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).toContain('第一幕');
      expect(text).toContain('建置');
      expect(text).toContain('第二幕');
      expect(text).toContain('发展');
      expect(text).toContain('第三幕');
      expect(text).toContain('高潮');
      expect(text).toContain('第四幕');
      expect(text).toContain('收束');
    });

    it('parses Act X english format from three-act structure', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        output: 'Act 1: Setup and introduction\nAct 2: Confrontation and rising action\nAct 3: Resolution and denouement',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const text = wrapper.find('[data-testid="outline-tree"]').text();
      expect(text).toContain('Act 1');
      expect(text).toContain('Act 2');
      expect(text).toContain('Act 3');
    });

    it('handles empty or unparseable outline gracefully', async () => {
      mockGetOutline.mockResolvedValue(makeOutlineData({
        input: 'structure: unknown\nsetting:',
        output: 'Some unstructured text without any segment markers',
      }));

      const wrapper = await mountView();
      await flushAsync(wrapper);

      const tree = wrapper.find('[data-testid="outline-tree"]');
      expect(tree.exists()).toBe(true);
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
