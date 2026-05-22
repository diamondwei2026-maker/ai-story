import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const SETTING_OUTPUT = [
  '## 时代背景',
  '仙历三千年，灵气复苏，修真文明达到顶峰。',
  '科技与仙术并存，飞舟穿梭于各大洲之间。',
  '',
  '## 地理环境',
  '九大洲漂浮于无尽海上，每洲有独特的气候与资源。',
  '中央大陆最为繁华，四方边陲妖兽横行。',
  '',
  '## 社会结构',
  '宗门、散修、凡人间三足鼎立。',
  '五大宗门掌控主要修炼资源，凡人王朝依附宗门生存。',
  '',
  '## 力量体系',
  '练气→筑基→金丹→元婴→化神→渡劫→大乘。',
  '每个境界分九层，突破需渡天劫。',
].join('\n');

describe('WorldBuilder', () => {
  const mountComponent = async (props: { content?: string }) => {
    const { default: WorldBuilder } = await import('@/components/WorldBuilder.vue');
    return mount(WorldBuilder, { props });
  };

  describe('rendering parsed dimensions (view mode)', () => {
    it('renders the world-builder container', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });
      expect(wrapper.find('[data-testid="world-builder"]').exists()).toBe(true);
    });

    it('renders four dimension sections from AI output', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      expect(wrapper.find('[data-testid="dimension-era"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-geography"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-society"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-power"]').exists()).toBe(true);
    });

    it('displays the correct label for each dimension', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      expect(wrapper.find('[data-testid="dimension-era"]').text()).toContain('时代背景');
      expect(wrapper.find('[data-testid="dimension-geography"]').text()).toContain('地理环境');
      expect(wrapper.find('[data-testid="dimension-society"]').text()).toContain('社会结构');
      expect(wrapper.find('[data-testid="dimension-power"]').text()).toContain('力量体系');
    });

    it('extracts and displays the content for each dimension', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      expect(wrapper.find('[data-testid="dimension-era"]').text()).toContain('灵气复苏');
      expect(wrapper.find('[data-testid="dimension-geography"]').text()).toContain('九大洲');
      expect(wrapper.find('[data-testid="dimension-society"]').text()).toContain('宗门');
      expect(wrapper.find('[data-testid="dimension-power"]').text()).toContain('练气');
    });

    it('renders an edit button to enter edit mode', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });
      expect(wrapper.find('[data-testid="edit-world-btn"]').exists()).toBe(true);
    });

    it('does not show textareas in view mode', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });
      expect(wrapper.find('textarea').exists()).toBe(false);
    });
  });

  describe('edit mode', () => {
    it('switches to edit mode when edit button is clicked', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      await wrapper.find('[data-testid="edit-world-btn"]').trigger('click');

      const textareas = wrapper.findAll('textarea');
      expect(textareas.length).toBe(4);
    });

    it('textarea shows the parsed dimension content', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      await wrapper.find('[data-testid="edit-world-btn"]').trigger('click');

      const eraTextarea = wrapper.find('[data-testid="dimension-era"] textarea');
      expect((eraTextarea.element as HTMLTextAreaElement).value).toContain('灵气复苏');
    });

    it('updates dimension content when user edits textarea', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      await wrapper.find('[data-testid="edit-world-btn"]').trigger('click');

      const eraTextarea = wrapper.find('[data-testid="dimension-era"] textarea');
      await eraTextarea.setValue('自定义时代背景：远古神话时代。');

      expect((eraTextarea.element as HTMLTextAreaElement).value).toContain('远古神话时代');
    });

    it('hides edit button in edit mode, shows save button', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      await wrapper.find('[data-testid="edit-world-btn"]').trigger('click');

      expect(wrapper.find('[data-testid="edit-world-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="save-world-btn"]').exists()).toBe(true);
    });

    it('returns to view mode with updated content after save', async () => {
      const wrapper = await mountComponent({ content: SETTING_OUTPUT });

      await wrapper.find('[data-testid="edit-world-btn"]').trigger('click');

      const eraTextarea = wrapper.find('[data-testid="dimension-era"] textarea');
      await eraTextarea.setValue('修仙纪元。');

      await wrapper.find('[data-testid="save-world-btn"]').trigger('click');

      // Back to view mode — textarea hidden
      expect(wrapper.find('textarea').exists()).toBe(false);
      // Updated content visible
      expect(wrapper.find('[data-testid="dimension-era"]').text()).toContain('修仙纪元');
      // Edit button visible again
      expect(wrapper.find('[data-testid="edit-world-btn"]').exists()).toBe(true);
    });
  });

  describe('header-based parsing', () => {
    it('parses ## headers to identify dimensions (trimming whitespace)', async () => {
      const wrapper = await mountComponent({
        content: '##  时代背景  \n自定义时代。\n## 力量体系\n自定义力量。',
      });

      expect(wrapper.find('[data-testid="dimension-era"]').text()).toContain('自定义时代');
      expect(wrapper.find('[data-testid="dimension-power"]').text()).toContain('自定义力量');
      // Unmatched dimensions display with empty content
      expect(wrapper.find('[data-testid="dimension-geography"]').exists()).toBe(true);
    });

    it('renders empty placeholders when content prop is undefined', async () => {
      const wrapper = await mountComponent({});

      expect(wrapper.find('[data-testid="dimension-era"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-geography"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-society"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="dimension-power"]').exists()).toBe(true);
    });

    it('handles Windows-style line endings', async () => {
      const wrapper = await mountComponent({
        content: '## 时代背景\r\n仙历纪元。\r\n\r\n## 地理环境\r\n九州大陆。',
      });

      expect(wrapper.find('[data-testid="dimension-era"]').text()).toContain('仙历纪元');
      expect(wrapper.find('[data-testid="dimension-geography"]').text()).toContain('九州大陆');
    });
  });
});
