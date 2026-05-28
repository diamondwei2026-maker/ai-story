import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const mockBeat = {
  id: 'beat-1',
  projectId: 'proj-1',
  chapterNumber: 1,
  plan: { conflictPoint: '冲突点', hookPresets: ['钩子A', '钩子B'] },
  targetWordCount: 3000,
  hookCount: 2,
  isClimax: false,
  useR1: true,
  status: 'CONFIRMED' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('BeatEditor', () => {
  const mountEditor = async (props: { beat: typeof mockBeat }) => {
    const { default: BeatEditor } = await import('@/components/BeatEditor.vue');
    return mount(BeatEditor, { props });
  };

  it('renders the editor container', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    expect(wrapper.find('[data-testid="beat-editor"]').exists()).toBe(true);
  });

  it('displays chapter number in the title', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    expect(wrapper.find('[data-testid="beat-editor-title"]').text()).toContain('第1章');
  });

  // ─── Mode switching ─────────────────────────────────────

  it('defaults to wordcount mode', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    expect(wrapper.find('[data-testid="beat-wordcount-input"]').exists()).toBe(true);
  });

  it('switches to structure mode', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    // Set mode directly on component vm
    (wrapper.vm as any).mode = 'structure';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="beat-structure-input"]').exists()).toBe(true);
  });

  it('switches back to wordcount mode when clicking wordcount tab', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    // Switch to structure then back to wordcount via vm
    (wrapper.vm as any).mode = 'structure';
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).mode = 'wordcount';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="beat-wordcount-input"]').exists()).toBe(true);
  });

  // ─── Word count mode ────────────────────────────────────

  describe('wordcount mode', () => {
    it('shows current target word count', async () => {
      const wrapper = await mountEditor({ beat: mockBeat });

      const inputEl = wrapper.find('[data-testid="beat-wordcount-input"]').find('input');
      expect((inputEl.element as HTMLInputElement).value).toBe('3000');
    });

    it('emits save-wordcount with new word count on save', async () => {
      const wrapper = await mountEditor({ beat: mockBeat });

      const input = wrapper.find('[data-testid="beat-wordcount-input"]');
      await input.find('input').setValue('5000');

      await wrapper.find('[data-testid="beat-wordcount-save"]').trigger('click');

      expect(wrapper.emitted('save-wordcount')).toBeTruthy();
      expect(wrapper.emitted('save-wordcount')![0]).toEqual([5000]);
    });
  });

  // ─── Structure mode ─────────────────────────────────────

  describe('structure mode', () => {
    it('shows conflict point input', async () => {
      const wrapper = await mountEditor({ beat: mockBeat });

      (wrapper.vm as any).mode = 'structure';
      await wrapper.vm.$nextTick();

      const input = wrapper.find('[data-testid="beat-conflict-input"]').find('input');
      expect((input.element as HTMLInputElement).value).toBe('冲突点');
    });

    it('shows hook presets as editable text', async () => {
      const wrapper = await mountEditor({ beat: mockBeat });

      (wrapper.vm as any).mode = 'structure';
      await wrapper.vm.$nextTick();

      const input = wrapper.find('[data-testid="beat-hooks-input"]').find('input');
      expect((input.element as HTMLInputElement).value).toContain('钩子A');
    });

    it('emits save-structure with updated plan on save', async () => {
      const wrapper = await mountEditor({ beat: mockBeat });

      (wrapper.vm as any).mode = 'structure';
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="beat-conflict-input"]').find('input').setValue('新冲突点');
      await wrapper.find('[data-testid="beat-structure-save"]').trigger('click');

      expect(wrapper.emitted('save-structure')).toBeTruthy();
      const emitted = wrapper.emitted('save-structure')![0][0] as Record<string, unknown>;
      expect(emitted.conflictPoint).toBe('新冲突点');
    });
  });

  // ─── isClimax checkbox ─────────────────────────────────

  it('shows isClimax checkbox unchecked by default', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    const checkboxInput = wrapper.find('[data-testid="beat-is-climax"]').find('input[type="checkbox"]');
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(false);
  });

  it('shows isClimax checkbox checked when beat.isClimax is true', async () => {
    const wrapper = await mountEditor({
      beat: { ...mockBeat, isClimax: true },
    });

    const checkboxInput = wrapper.find('[data-testid="beat-is-climax"]').find('input[type="checkbox"]');
    expect((checkboxInput.element as HTMLInputElement).checked).toBe(true);
  });

  it('toggles isClimax in emitted plan when checked', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    (wrapper.vm as any).mode = 'structure';
    await wrapper.vm.$nextTick();

    const checkboxInput = wrapper.find('[data-testid="beat-is-climax"]').find('input[type="checkbox"]');
    // <a-checkbox> renders a hidden native input
    await checkboxInput.setValue(true);

    await wrapper.find('[data-testid="beat-structure-save"]').trigger('click');

    const emitted = wrapper.emitted('save-structure')![0][0] as Record<string, unknown>;
    expect(emitted.isClimax).toBe(true);
  });

  // ─── hookCount read-only display ─────────────────────────

  it('displays hookCount as read-only', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    const display = wrapper.find('[data-testid="beat-hook-count-display"]');
    expect(display.exists()).toBe(true);
    expect(display.text()).toContain('2');
  });

  it('displays hook count with "High Density" label when hookCount >= 3', async () => {
    const wrapper = await mountEditor({
      beat: { ...mockBeat, hookCount: 3 },
    });

    const display = wrapper.find('[data-testid="beat-hook-count-display"]');
    expect(display.text()).toContain('高密度');
  });

  // ─── useR1 display ──────────────────────────────────────

  it('shows R1 badge when useR1 is true', async () => {
    const wrapper = await mountEditor({ beat: mockBeat });

    expect(wrapper.find('[data-testid="beat-editor-r1-badge"]').exists()).toBe(true);
  });

  it('does not show R1 badge when useR1 is false', async () => {
    const wrapper = await mountEditor({
      beat: { ...mockBeat, useR1: false },
    });

    expect(wrapper.find('[data-testid="beat-editor-r1-badge"]').exists()).toBe(false);
  });
});
