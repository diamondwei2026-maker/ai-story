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

  const mountStepper = async (props: { steps: StepInfo[]; currentPhase: PhaseType; phaseOrder: PhaseType[] }) => {
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

    const activeStep = wrapper.find('[data-testid="step-item"].step--active');
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
});
