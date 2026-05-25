import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('TextToolbar', () => {
  const mountToolbar = async (props: {
    isGenerating: boolean;
    isPaused: boolean;
    showRetryFeedback: boolean;
  }) => {
    const { default: TextToolbar } = await import('@/components/TextToolbar.vue');
    return mount(TextToolbar, { props });
  };

  it('renders pause button when generating and not paused', async () => {
    const wrapper = await mountToolbar({
      isGenerating: true,
      isPaused: false,
      showRetryFeedback: false,
    });

    const pauseBtn = wrapper.find('[data-testid="btn-pause"]');
    expect(pauseBtn.exists()).toBe(true);
  });

  it('renders continue button when paused', async () => {
    const wrapper = await mountToolbar({
      isGenerating: false,
      isPaused: true,
      showRetryFeedback: false,
    });

    const continueBtn = wrapper.find('[data-testid="btn-continue"]');
    expect(continueBtn.exists()).toBe(true);
  });

  it('renders retry button when not generating', async () => {
    const wrapper = await mountToolbar({
      isGenerating: false,
      isPaused: false,
      showRetryFeedback: false,
    });

    const retryBtn = wrapper.find('[data-testid="btn-retry"]');
    expect(retryBtn.exists()).toBe(true);
  });

  it('shows feedback input when showRetryFeedback is true', async () => {
    const wrapper = await mountToolbar({
      isGenerating: false,
      isPaused: false,
      showRetryFeedback: true,
    });

    const feedbackInput = wrapper.find('[data-testid="retry-feedback-input"]');
    expect(feedbackInput.exists()).toBe(true);
  });

  it('emits pause when pause button clicked', async () => {
    const wrapper = await mountToolbar({
      isGenerating: true,
      isPaused: false,
      showRetryFeedback: false,
    });

    await wrapper.find('[data-testid="btn-pause"]').trigger('click');
    expect(wrapper.emitted('pause')).toBeTruthy();
  });

  it('emits continue when continue button clicked', async () => {
    const wrapper = await mountToolbar({
      isGenerating: false,
      isPaused: true,
      showRetryFeedback: false,
    });

    await wrapper.find('[data-testid="btn-continue"]').trigger('click');
    expect(wrapper.emitted('continue')).toBeTruthy();
  });

  it('emits retry with feedback when retry button clicked with feedback', async () => {
    const wrapper = await mountToolbar({
      isGenerating: false,
      isPaused: false,
      showRetryFeedback: true,
    });

    const input = wrapper.find('[data-testid="retry-feedback-input"]');
    await input.setValue('希望主角性格更果断');
    await wrapper.find('[data-testid="btn-retry"]').trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
    expect(wrapper.emitted('retry')![0]).toEqual(['希望主角性格更果断']);
  });
});
