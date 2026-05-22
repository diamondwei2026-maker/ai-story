import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

const RELATION_OUTPUT = [
  '## 角色关系',
  '冲突关系：',
  '- 叶凡 vs 血魔老祖：灭门之仇，不死不休的宿敌',
  '- 叶凡 vs 天道宗：宗门被灭，誓要讨回公道',
  '',
  '情感纽带：',
  '- 叶凡 ↔ 苏灵儿：道侣，生死相依',
  '- 叶凡 → 师尊李道玄：师徒情深，传承剑道',
].join('\n');

describe('RelationGraph', () => {
  const mountComponent = async (props: { content?: string }) => {
    const { default: RelationGraph } = await import('@/components/RelationGraph.vue');
    return mount(RelationGraph, { props });
  };

  describe('rendering', () => {
    it('renders the relation-graph container', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });
      expect(wrapper.find('[data-testid="relation-graph"]').exists()).toBe(true);
    });

    it('shows "角色关系图" title', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });
      expect(wrapper.find('[data-testid="relation-graph-title"]').text()).toBe('角色关系图');
    });

    it('displays conflict relations section', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      const conflicts = wrapper.find('[data-testid="relation-conflicts"]');
      expect(conflicts.exists()).toBe(true);
      expect(conflicts.text()).toContain('冲突关系');
      expect(conflicts.text()).toContain('叶凡 vs 血魔老祖');
      expect(conflicts.text()).toContain('灭门之仇');
    });

    it('displays emotional bonds section', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      const bonds = wrapper.find('[data-testid="relation-bonds"]');
      expect(bonds.exists()).toBe(true);
      expect(bonds.text()).toContain('情感纽带');
      expect(bonds.text()).toContain('叶凡 ↔ 苏灵儿');
      expect(bonds.text()).toContain('道侣');
    });
  });

  describe('edit mode', () => {
    it('has an edit button that toggles to edit mode', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      const editBtn = wrapper.find('[data-testid="edit-relation-btn"]');
      expect(editBtn.exists()).toBe(true);

      await editBtn.trigger('click');

      expect(wrapper.find('textarea').exists()).toBe(true);
    });

    it('shows textareas for both conflicts and bonds in edit mode', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      await wrapper.find('[data-testid="edit-relation-btn"]').trigger('click');

      const textareas = wrapper.findAll('textarea');
      expect(textareas.length).toBe(2);
    });

    it('shows save button in edit mode', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      await wrapper.find('[data-testid="edit-relation-btn"]').trigger('click');

      expect(wrapper.find('[data-testid="save-relation-btn"]').exists()).toBe(true);
    });

    it('returns to view mode after save', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      await wrapper.find('[data-testid="edit-relation-btn"]').trigger('click');
      await wrapper.find('[data-testid="save-relation-btn"]').trigger('click');

      expect(wrapper.find('textarea').exists()).toBe(false);
    });

    it('preserves edited content after save', async () => {
      const wrapper = await mountComponent({ content: RELATION_OUTPUT });

      await wrapper.find('[data-testid="edit-relation-btn"]').trigger('click');

      const textareas = wrapper.findAll('textarea');
      await textareas[0].setValue('自定义冲突关系：新的冲突内容。');

      await wrapper.find('[data-testid="save-relation-btn"]').trigger('click');

      expect(wrapper.find('[data-testid="relation-conflicts"]').text()).toContain('新的冲突内容');
    });
  });

  describe('edge cases', () => {
    it('renders empty placeholders when no content provided', async () => {
      const wrapper = await mountComponent({});

      expect(wrapper.find('[data-testid="relation-graph"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="relation-conflicts"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="relation-bonds"]').exists()).toBe(true);
    });

    it('handles partial relation data (only conflicts, no bonds)', async () => {
      const wrapper = await mountComponent({
        content: '## 角色关系\n冲突关系：\n- 叶凡 vs 血魔老祖：灭门之仇',
      });

      const conflicts = wrapper.find('[data-testid="relation-conflicts"]');
      expect(conflicts.text()).toContain('灭门之仇');

      const bonds = wrapper.find('[data-testid="relation-bonds"]');
      expect(bonds.exists()).toBe(true);
    });

    it('renders without edit button when there is no content', async () => {
      const wrapper = await mountComponent({});

      expect(wrapper.find('[data-testid="edit-relation-btn"]').exists()).toBe(false);
    });
  });
});
