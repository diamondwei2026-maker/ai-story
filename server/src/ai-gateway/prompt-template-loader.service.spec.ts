import { Test, TestingModule } from '@nestjs/testing';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';

describe('PromptTemplateLoaderService', () => {
  let service: PromptTemplateLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptTemplateLoaderService],
    }).compile();
    service = module.get<PromptTemplateLoaderService>(PromptTemplateLoaderService);
  });

  describe('loadTemplate', () => {
    it('should load raw template content by category and name', () => {
      const content = service.loadTemplate('creation', 'idea-generation');
      expect(content).toContain('小说创意顾问');
      expect(content).toContain('{{idea}}');
      expect(content).toContain('{{feedback}}');
    });

    it('should throw when category does not exist', () => {
      expect(() => service.loadTemplate('nonexistent', 'some-template')).toThrow();
    });

    it('should throw when template name does not exist in valid category', () => {
      expect(() => service.loadTemplate('creation', 'nonexistent-template')).toThrow();
    });

    it('should load beats-generation template', () => {
      const content = service.loadTemplate('creation', 'beats-generation');
      expect(content).toContain('大纲');
      expect(content).toContain('{{outline}}');
      expect(content).toContain('{{currentContent}}');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with all variables replaced', () => {
      const rendered = service.renderTemplate('creation', 'idea-generation', {
        idea: '一个星际冒险故事',
        feedback: '希望加入悬疑元素',
      });
      expect(rendered).toContain('星际冒险故事');
      expect(rendered).toContain('悬疑元素');
      expect(rendered).not.toContain('{{idea}}');
      expect(rendered).not.toContain('{{feedback}}');
    });

    it('should leave unmatched placeholders intact', () => {
      const rendered = service.renderTemplate('creation', 'idea-generation', {
        idea: '测试创意',
      });
      expect(rendered).toContain('测试创意');
      expect(rendered).toContain('{{feedback}}');
    });

    it('should render template with no variables', () => {
      // system/style-config.md 只使用了 {{}} 占位符，传入全部变量后不应有残留
      const rendered = service.renderTemplate('system', 'style-config', {
        narrativePOV: '第三人称',
        tense: '过去时',
        languageStyle: '文艺',
        descriptionDensity: '中',
        dialogueRatio: '30%',
        pacing: '快',
      });
      expect(rendered).toContain('第三人称');
      expect(rendered).not.toContain('{{');
    });

    it('should render chapter-generation template with all 8 variables', () => {
      const rendered = service.renderTemplate('creation', 'chapter-generation', {
        mode: 'new-continue',
        beatPlan: '{"chapterNumber":1,"plan":"主角觉醒异能"}',
        targetWordCount: '3000',
        feedback: '希望主角性格更果断',
        previousSummary: '前一章：主角遭遇神秘事件',
        globalStatic: '世界观：灵气复苏，异能觉醒',
        globalDynamic: '主角异能等级：初级',
        localContext: '当前节拍：异能觉醒，初次展现力量',
      });
      expect(rendered).toContain('new-continue');
      expect(rendered).toContain('主角觉醒异能');
      expect(rendered).toContain('3000');
      expect(rendered).toContain('希望主角性格更果断');
      expect(rendered).toContain('主角遭遇神秘事件');
      expect(rendered).toContain('灵气复苏');
      expect(rendered).toContain('初级');
      expect(rendered).toContain('异能觉醒');
      expect(rendered).not.toContain('{{mode}}');
      expect(rendered).not.toContain('{{beatPlan}}');
      expect(rendered).not.toContain('{{targetWordCount}}');
    });

    it('should throw when template not found', () => {
      expect(() =>
        service.renderTemplate('creation', 'not-found', {}),
      ).toThrow();
    });
  });

  describe('listTemplates', () => {
    it('should list all templates in a given category', () => {
      const templates = service.listTemplates('creation');
      expect(templates).toHaveLength(10);
      expect(templates).toContain('idea-generation');
      expect(templates).toContain('idea-summary-generation');
      expect(templates).toContain('setting-generation');
      expect(templates).toContain('outline-generation');
      expect(templates).toContain('beats-generation');
      expect(templates).toContain('beats-adjust');
      expect(templates).toContain('beats-batch-adjust');
      expect(templates).toContain('change-analysis');
      expect(templates).toContain('targeted-fix');
      expect(templates).toContain('chapter-generation');
    });

    it('should list review templates', () => {
      const templates = service.listTemplates('review');
      expect(templates).toContain('independent-review');
      expect(templates).toContain('appeal-review');
    });

    it('should return empty array for category with no templates', () => {
      const templates = service.listTemplates('extraction');
      expect(templates).toEqual([]);
    });

    it('should list all templates across all categories when no category specified', () => {
      const all = service.listTemplates();
      expect(all.length).toBeGreaterThanOrEqual(5);
      expect(all).toContain('creation/idea-generation');
      expect(all).toContain('creation/setting-generation');
      expect(all).toContain('creation/beats-generation');
      expect(all).toContain('creation/chapter-generation');
      expect(all).toContain('system/style-config');
    });

    it('should throw for invalid category', () => {
      expect(() => service.listTemplates('invalid-category')).toThrow();
    });
  });
});
