import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const CHARACTER_OUTPUT = [
  '## 主角',
  '名称：叶凡',
  '欲望：成为最强剑修，守护所爱之人',
  '动机：家族被灭门，血仇未报，剑道是唯一的出路',
  '结局：放下执念，以剑证道，得道飞升',
  '',
  '## 反派',
  '名称：血魔老祖',
  '欲望：以血祭苍生，突破大乘境',
  '动机：曾遭正道宗门背叛，以复仇为信仰',
  '结局：被叶凡以心剑斩灭执念本源，魂飞魄散',
  '',
  '## 重要配角',
  '名称：苏灵儿',
  '欲望：复兴苏家炼丹术，成为丹道宗师',
  '动机：苏家血脉凋零，唯有她继承了祖传丹方',
  '结局：建立丹道联盟，与叶凡结为道侣',
].join('\n');

describe('CharacterCard', () => {
  const mountComponent = async (props: { content?: string }) => {
    const { default: CharacterCard } = await import('@/components/CharacterCard.vue');
    return mount(CharacterCard, { props });
  };

  describe('rendering characters', () => {
    it('renders the character-card container', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });
      expect(wrapper.find('[data-testid="character-card"]').exists()).toBe(true);
    });

    it('renders a section for each character role', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      expect(wrapper.find('[data-testid="char-protagonist"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="char-villain"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="char-supporting"]').exists()).toBe(true);
    });

    it('displays character name and role label', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const protagonist = wrapper.find('[data-testid="char-protagonist"]');
      expect(protagonist.text()).toContain('主角');
      expect(protagonist.text()).toContain('叶凡');
    });

    it('shows "角色卡" title', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });
      expect(wrapper.find('[data-testid="character-card-title"]').text()).toBe('角色卡');
    });
  });

  describe('three arcs', () => {
    it('displays desire arc for each character', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const protagonist = wrapper.find('[data-testid="char-protagonist"]');
      expect(protagonist.text()).toContain('欲望');
      expect(protagonist.text()).toContain('成为最强剑修');
    });

    it('displays motivation arc for each character', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const protagonist = wrapper.find('[data-testid="char-protagonist"]');
      expect(protagonist.text()).toContain('动机');
      expect(protagonist.text()).toContain('家族被灭门');
    });

    it('displays ending arc for each character', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const villain = wrapper.find('[data-testid="char-villain"]');
      expect(villain.text()).toContain('结局');
      expect(villain.text()).toContain('魂飞魄散');
    });

    it('shows arc labels with data-testid per arc', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const protagonist = wrapper.find('[data-testid="char-protagonist"]');
      expect(protagonist.find('[data-testid="arc-desire"]').exists()).toBe(true);
      expect(protagonist.find('[data-testid="arc-motivation"]').exists()).toBe(true);
      expect(protagonist.find('[data-testid="arc-ending"]').exists()).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('has an edit button that toggles to edit mode', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      const editBtn = wrapper.find('[data-testid="edit-character-btn"]');
      expect(editBtn.exists()).toBe(true);

      await editBtn.trigger('click');

      expect(wrapper.find('textarea').exists()).toBe(true);
    });

    it('shows textarea for each arc in edit mode', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      await wrapper.find('[data-testid="edit-character-btn"]').trigger('click');

      const textareas = wrapper.findAll('textarea');
      // 3 characters × 3 arcs = 9 textareas
      expect(textareas.length).toBe(9);
    });

    it('shows save button in edit mode', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      await wrapper.find('[data-testid="edit-character-btn"]').trigger('click');

      expect(wrapper.find('[data-testid="save-character-btn"]').exists()).toBe(true);
    });

    it('returns to view mode after save', async () => {
      const wrapper = await mountComponent({ content: CHARACTER_OUTPUT });

      await wrapper.find('[data-testid="edit-character-btn"]').trigger('click');
      await wrapper.find('[data-testid="save-character-btn"]').trigger('click');

      expect(wrapper.find('textarea').exists()).toBe(false);
    });
  });

  describe('content parsing edge cases', () => {
    it('renders empty placeholders when no content provided', async () => {
      const wrapper = await mountComponent({});

      expect(wrapper.find('[data-testid="character-card"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="char-empty"]').exists()).toBe(true);
    });

    it('handles partial character data (missing arcs)', async () => {
      const wrapper = await mountComponent({
        content: '## 主角\n名称：无名\n欲望：未知',
      });

      const protagonist = wrapper.find('[data-testid="char-protagonist"]');
      expect(protagonist.text()).toContain('无名');
      // Missing arcs should still render labels
      expect(protagonist.find('[data-testid="arc-desire"]').exists()).toBe(true);
      expect(protagonist.find('[data-testid="arc-motivation"]').exists()).toBe(true);
      expect(protagonist.find('[data-testid="arc-ending"]').exists()).toBe(true);
    });

    it('handles only protagonist without villain or supporting', async () => {
      const wrapper = await mountComponent({
        content: '## 主角\n名称：独行侠\n欲望：自由\n动机：无拘无束\n结局：浪迹天涯',
      });

      expect(wrapper.find('[data-testid="char-protagonist"]').exists()).toBe(true);
      // Other roles render with empty data
      expect(wrapper.find('[data-testid="char-villain"]').text()).not.toContain('名称');
      expect(wrapper.find('[data-testid="char-supporting"]').text()).not.toContain('名称');
    });
  });
});
