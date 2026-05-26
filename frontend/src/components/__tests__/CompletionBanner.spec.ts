import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

describe('CompletionBanner', () => {
  const mountBanner = async (props: {
    visible: boolean;
    pendingUpdateCount?: number;
  }) => {
    const { default: CompletionBanner } = await import(
      '@/components/CompletionBanner.vue'
    );
    return mount(CompletionBanner, { props });
  };

  it('should render the completion banner when visible is true', async () => {
    const wrapper = await mountBanner({ visible: true });

    expect(wrapper.find('[data-testid="completion-banner"]').exists()).toBe(true);
  });

  it('should not render when visible is false', async () => {
    const wrapper = await mountBanner({ visible: false });

    expect(wrapper.find('[data-testid="completion-banner"]').exists()).toBe(false);
  });

  it('should display the completion prompt text', async () => {
    const wrapper = await mountBanner({ visible: true });

    const text = wrapper.find('[data-testid="completion-banner-text"]');
    expect(text.exists()).toBe(true);
    expect(text.text()).toContain('完本');
  });

  it('should render the confirm completion button', async () => {
    const wrapper = await mountBanner({ visible: true });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    expect(btn.exists()).toBe(true);
  });

  it('should emit confirm-completion when button is clicked (no pending updates)', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 0 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    expect(wrapper.emitted('confirm-completion')).toBeTruthy();
    expect(wrapper.emitted('confirm-completion')!.length).toBe(1);
  });

  it('should show pending updates dialog when pendingUpdateCount > 0', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 3 });

    // Clicking confirm should show the three-option dialog instead of immediately emitting
    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    // The three-option dialog should appear
    const dialog = wrapper.find('[data-testid="completion-options-dialog"]');
    expect(dialog.exists()).toBe(true);
  });

  it('should show three options in the pending updates dialog', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 2 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    const options = wrapper.findAll('[data-testid^="completion-option-"]');
    expect(options).toHaveLength(3);
  });

  it('should emit sync-and-complete when first option is clicked', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 1 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    const syncOption = wrapper.find('[data-testid="completion-option-sync"]');
    await syncOption.trigger('click');

    expect(wrapper.emitted('confirm-completion')).toBeTruthy();
    // The payload should indicate sync-and-complete
    const payload = wrapper.emitted('confirm-completion')![0][0] as Record<
      string,
      unknown
    >;
    expect(payload.action).toBe('sync-and-complete');
  });

  it('should emit skip-and-complete when second option is clicked', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 1 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    const skipOption = wrapper.find('[data-testid="completion-option-skip"]');
    await skipOption.trigger('click');

    const payload = wrapper.emitted('confirm-completion')![0][0] as Record<
      string,
      unknown
    >;
    expect(payload.action).toBe('skip-and-complete');
  });

  it('should close dialog without emitting when cancel is clicked', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 1 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    const cancelOption = wrapper.find('[data-testid="completion-option-cancel"]');
    await cancelOption.trigger('click');

    // No confirm-completion event should be emitted
    expect(wrapper.emitted('confirm-completion')).toBeFalsy();
    // Dialog should close
    expect(wrapper.find('[data-testid="completion-options-dialog"]').exists()).toBe(
      false,
    );
  });

  it('should display queue depth in the dialog', async () => {
    const wrapper = await mountBanner({ visible: true, pendingUpdateCount: 5 });

    const btn = wrapper.find('[data-testid="confirm-completion-btn"]');
    await btn.trigger('click');

    const depthEl = wrapper.find('[data-testid="completion-queue-depth"]');
    expect(depthEl.exists()).toBe(true);
    expect(depthEl.text()).toContain('5');
  });
});
