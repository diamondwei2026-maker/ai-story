import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

type PhaseType = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING';
type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED';

interface StepInfo {
  phase: PhaseType;
  label: string;
  status: StepStatus;
}

describe('WorkflowStepper', () => {
  const steps: StepInfo[] = [
    { phase: 'IDEA', label: '灵感提取', status: 'CONFIRMED' },
    { phase: 'SETTING', label: '设定集', status: 'CONFIRMED' },
    { phase: 'OUTLINE', label: '剧情大纲', status: 'IN_PROGRESS' },
    { phase: 'BEATS', label: '细纲拆解', status: 'PENDING' },
    { phase: 'DRAFTING', label: '正文迭代', status: 'PENDING' },
  ];

  const mountStepper = async (props: {
    steps: StepInfo[];
    currentPhase: PhaseType;
    phaseOrder: PhaseType[];
    factsheetAlert?: { level: string; depth: number };
    projectStatus?: string;
    allChaptersCompleted?: boolean;
  }) => {
    const { default: WorkflowStepper } = await import('@/components/WorkflowStepper.vue');
    return mount(WorkflowStepper, { props });
  };

  it('renders all 5 steps', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    const stepItems = wrapper.findAll('[data-testid="step-item"]');
    expect(stepItems).toHaveLength(5);
  });

  it('renders step labels correctly', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    const stepLabels = wrapper.findAll('[data-testid="step-label"]');
    expect(stepLabels[0].text()).toBe('灵感提取');
    expect(stepLabels[2].text()).toBe('剧情大纲');
    expect(stepLabels[4].text()).toBe('正文迭代');
  });

  it('highlights the current phase step with an active class', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    const activeStep = wrapper.find('[data-testid="step-item"].ant-steps-item-active');
    expect(activeStep.exists()).toBe(true);
    expect(activeStep.find('[data-testid="step-label"]').text()).toBe('剧情大纲');
  });

  it('shows CONFIRMED status badge for completed steps', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    const ideaStep = wrapper.findAll('[data-testid="step-item"]')[0];
    expect(ideaStep.find('[data-testid="step-status"]').text()).toContain('已完成');
  });

  it('shows IN_PROGRESS status badge for the in-progress step', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    const outlineStep = wrapper.findAll('[data-testid="step-item"]')[2];
    expect(outlineStep.find('[data-testid="step-status"]').text()).toContain('进行中');
  });

  it('emits step-click event when clicking an accessible step', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    await wrapper.findAll('[data-testid="step-item"]')[0].trigger('click');

    expect(wrapper.emitted('step-click')).toBeTruthy();
    expect(wrapper.emitted('step-click')![0]).toEqual(['IDEA']);
  });

  it('does not emit step-click when clicking a future phase step', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    await wrapper.findAll('[data-testid="step-item"]')[4].trigger('click');

    expect(wrapper.emitted('step-click')).toBeFalsy();
  });

  it('renders the step counter (e.g., "步骤 3/5")', async () => {
    const wrapper = await mountStepper({
      steps,
      currentPhase: 'OUTLINE',
      phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
    });

    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('5');
  });

  // ══════════════════════════════════════════════════════════════════
  // Factsheet alert banner
  // ══════════════════════════════════════════════════════════════════

  describe('factsheet alert banner', () => {
    it('should not render alert banner when factsheetAlert prop is not passed', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'OUTLINE',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
      });

      expect(wrapper.find('[data-testid="factsheet-alert-banner"]').exists()).toBe(false);
    });

    it('should not render alert banner when level is NORMAL', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'OUTLINE',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'NORMAL', depth: 0 },
      });

      expect(wrapper.find('[data-testid="factsheet-alert-banner"]').exists()).toBe(false);
    });

    it('should not render alert banner when level is PRIORITY', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'OUTLINE',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'PRIORITY', depth: 7 },
      });

      expect(wrapper.find('[data-testid="factsheet-alert-banner"]').exists()).toBe(false);
    });

    it('should render alert banner when level is WARNING', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'WARNING', depth: 15 },
      });

      const banner = wrapper.find('[data-testid="factsheet-alert-banner"]');
      expect(banner.exists()).toBe(true);
    });

    it('should render alert banner when level is CRITICAL', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'CRITICAL', depth: 50 },
      });

      const banner = wrapper.find('[data-testid="factsheet-alert-banner"]');
      expect(banner.exists()).toBe(true);
    });

    it('should display warning message in the alert banner', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'WARNING', depth: 12 },
      });

      const textEl = wrapper.find('[data-testid="factsheet-alert-text"]');
      expect(textEl.exists()).toBe(true);
      expect(textEl.text()).toContain('事实簿同步延迟');
      expect(textEl.text()).toContain('建议暂停生成');
    });

    it('should display queue depth in the alert banner', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'WARNING', depth: 23 },
      });

      const depthEl = wrapper.find('[data-testid="factsheet-alert-depth"]');
      expect(depthEl.exists()).toBe(true);
      expect(depthEl.text()).toContain('23');
    });

    it('should display force sync button in the alert banner', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'WARNING', depth: 15 },
      });

      const btn = wrapper.find('[data-testid="force-sync-btn"]');
      expect(btn.exists()).toBe(true);
    });

    it('should emit force-sync when button is clicked', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'WARNING', depth: 15 },
      });

      const btn = wrapper.find('[data-testid="force-sync-btn"]');
      await btn.trigger('click');

      expect(wrapper.emitted('force-sync')).toBeTruthy();
      expect(wrapper.emitted('force-sync')!.length).toBe(1);
    });

    it('should show same text for CRITICAL level as WARNING', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        factsheetAlert: { level: 'CRITICAL', depth: 50 },
      });

      const textEl = wrapper.find('[data-testid="factsheet-alert-text"]');
      expect(textEl.exists()).toBe(true);
      expect(textEl.text()).toContain('事实簿同步延迟');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Project Completion — read-only mode (Issue #16)
  // ══════════════════════════════════════════════════════════════════

  describe('COMPLETED read-only mode', () => {
    const completedSteps: StepInfo[] = [
      { phase: 'IDEA', label: '灵感提取', status: 'CONFIRMED' },
      { phase: 'SETTING', label: '设定集', status: 'CONFIRMED' },
      { phase: 'OUTLINE', label: '剧情大纲', status: 'CONFIRMED' },
      { phase: 'BEATS', label: '细纲拆解', status: 'CONFIRMED' },
      { phase: 'DRAFTING', label: '正文迭代', status: 'CONFIRMED' },
    ];

    it('should render read-only overlay when projectStatus is COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'COMPLETED',
      });

      const overlay = wrapper.find('[data-testid="readonly-overlay"]');
      expect(overlay.exists()).toBe(true);
    });

    it('should not render read-only overlay when projectStatus is not COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'DRAFTING',
      });

      expect(wrapper.find('[data-testid="readonly-overlay"]').exists()).toBe(false);
    });

    it('should not emit step-click when in COMPLETED read-only mode', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'COMPLETED',
      });

      await wrapper.findAll('[data-testid="step-item"]')[0].trigger('click');

      expect(wrapper.emitted('step-click')).toBeFalsy();
    });

    it('should render "Continue Writing" button when projectStatus is COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'COMPLETED',
      });

      const btn = wrapper.find('[data-testid="reopen-project-btn"]');
      expect(btn.exists()).toBe(true);
      expect(btn.text()).toContain('继续创作');
    });

    it('should not render "Continue Writing" button when projectStatus is not COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'DRAFTING',
      });

      expect(wrapper.find('[data-testid="reopen-project-btn"]').exists()).toBe(false);
    });

    it('should emit reopen-project when "Continue Writing" button is clicked', async () => {
      const wrapper = await mountStepper({
        steps: completedSteps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        projectStatus: 'COMPLETED',
      });

      const btn = wrapper.find('[data-testid="reopen-project-btn"]');
      await btn.trigger('click');

      expect(wrapper.emitted('reopen-project')).toBeTruthy();
      expect(wrapper.emitted('reopen-project')!.length).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Completion banner visibility (Issue #16)
  // ══════════════════════════════════════════════════════════════════

  describe('completion banner in stepper', () => {
    it('should render completion banner slot when allChaptersCompleted is true and project is not COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: [
          { phase: 'IDEA', label: '灵感提取', status: 'CONFIRMED' },
          { phase: 'SETTING', label: '设定集', status: 'CONFIRMED' },
          { phase: 'OUTLINE', label: '剧情大纲', status: 'CONFIRMED' },
          { phase: 'BEATS', label: '细纲拆解', status: 'CONFIRMED' },
          { phase: 'DRAFTING', label: '正文迭代', status: 'CONFIRMED' },
        ],
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        allChaptersCompleted: true,
        projectStatus: 'DRAFTING',
      });

      const banner = wrapper.find('[data-testid="completion-banner-area"]');
      expect(banner.exists()).toBe(true);
    });

    it('should not render completion banner area when allChaptersCompleted is false', async () => {
      const wrapper = await mountStepper({
        steps,
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        allChaptersCompleted: false,
      });

      expect(wrapper.find('[data-testid="completion-banner-area"]').exists()).toBe(
        false,
      );
    });

    it('should not render completion banner area when project is already COMPLETED', async () => {
      const wrapper = await mountStepper({
        steps: [
          { phase: 'IDEA', label: '灵感提取', status: 'CONFIRMED' },
          { phase: 'SETTING', label: '设定集', status: 'CONFIRMED' },
          { phase: 'OUTLINE', label: '剧情大纲', status: 'CONFIRMED' },
          { phase: 'BEATS', label: '细纲拆解', status: 'CONFIRMED' },
          { phase: 'DRAFTING', label: '正文迭代', status: 'CONFIRMED' },
        ],
        currentPhase: 'DRAFTING',
        phaseOrder: ['IDEA', 'SETTING', 'OUTLINE', 'BEATS', 'DRAFTING'],
        allChaptersCompleted: true,
        projectStatus: 'COMPLETED',
      });

      expect(wrapper.find('[data-testid="completion-banner-area"]').exists()).toBe(
        false,
      );
    });
  });
});
