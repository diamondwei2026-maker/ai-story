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
      expect(content).toContain('{{title}}');
      expect(content).toContain('{{genre}}');
    });

    it('should throw when category does not exist', () => {
      expect(() => service.loadTemplate('nonexistent', 'some-template')).toThrow();
    });

    it('should throw when template name does not exist in valid category', () => {
      expect(() => service.loadTemplate('creation', 'nonexistent-template')).toThrow();
    });
  });

  describe('renderTemplate', () => {
    it('should render template with all variables replaced', () => {
      const rendered = service.renderTemplate('creation', 'idea-generation', {
        title: '星辰战纪',
        genre: '科幻',
        targetAudience: '青年读者',
      });
      expect(rendered).toContain('星辰战纪');
      expect(rendered).toContain('科幻');
      expect(rendered).toContain('青年读者');
      expect(rendered).not.toContain('{{title}}');
      expect(rendered).not.toContain('{{genre}}');
      expect(rendered).not.toContain('{{targetAudience}}');
    });

    it('should leave unmatched placeholders intact', () => {
      const rendered = service.renderTemplate('creation', 'idea-generation', {
        title: '测试书名',
      });
      expect(rendered).toContain('测试书名');
      expect(rendered).toContain('{{genre}}');
      expect(rendered).toContain('{{targetAudience}}');
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

    it('should throw when template not found', () => {
      expect(() =>
        service.renderTemplate('creation', 'not-found', {}),
      ).toThrow();
    });
  });

  describe('listTemplates', () => {
    it('should list all templates in a given category', () => {
      const templates = service.listTemplates('creation');
      expect(templates).toHaveLength(4);
      expect(templates).toContain('idea-generation');
      expect(templates).toContain('idea-summary-generation');
      expect(templates).toContain('setting-generation');
      expect(templates).toContain('outline-generation');
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
      expect(all.length).toBeGreaterThanOrEqual(4);
      expect(all).toContain('creation/idea-generation');
      expect(all).toContain('creation/setting-generation');
      expect(all).toContain('drafting/chapter-write');
      expect(all).toContain('system/style-config');
    });

    it('should throw for invalid category', () => {
      expect(() => service.listTemplates('invalid-category')).toThrow();
    });
  });
});
