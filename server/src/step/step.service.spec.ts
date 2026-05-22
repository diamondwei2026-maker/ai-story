import { Test, TestingModule } from '@nestjs/testing';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, TaskType, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { StepData, PhaseType, StepStatus } from './step.entity';

const mockChatModel = {
  stream: async function* () {
    yield { content: '## 时代背景\n这是一个修真世界。\n' };
    yield { content: '## 力量体系\n炼气、筑基、金丹、元婴、化神。\n' };
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockReturnValue('rendered setting prompt'),
};

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
};

describe('StepService', () => {
  let service: StepService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepService,
        ProjectService,
        AIGatewayService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
      ],
    }).compile();

    service = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  describe('generateSetting', () => {
    it('should generate world-building content via AI and store as StepData', async () => {
      const project = projectService.create({ title: '修真故事' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '一个重生修仙的故事',
      });

      expect(step).toBeDefined();
      expect(step.projectId).toBe(project.id);
      expect(step.phaseType).toBe('SETTING');
      expect(step.status).toBe('AWAITING_REVIEW');
      expect(step.output).toBeTruthy();
      expect(step.output).toContain('时代背景');
      expect(step.output).toContain('力量体系');
      expect(step.version).toBe(1);
      expect(step.input).toContain('一个重生修仙的故事');
    });

    it('should call AIGatewayService with TaskType.SETTING', async () => {
      const project = projectService.create({ title: '测试项目' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '测试创意',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalled();
      expect(step.output).toBeTruthy();
    });

    it('should include review annotations in the StepData', async () => {
      const project = projectService.create({ title: '带审核' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '现代都市异能',
      });

      expect(step.review).toBeDefined();
      expect(step.review).toHaveProperty('powerSystemCheck');
      expect(step.review).toHaveProperty('annotations');
    });

    it('should throw when project does not exist', async () => {
      await expect(
        service.generateSetting('nonexistent-id', { idea: 'test' }),
      ).rejects.toThrow(/Project not found/);
    });

    it('should use regeneration prompt when currentContent is provided', async () => {
      const project = projectService.create({ title: '刷新测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const currentContent = '用户编辑后的设定内容';
      await service.generateSetting(project.id, {
        idea: '原始创意',
        currentContent,
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'setting-generation',
        expect.objectContaining({ currentContent }),
      );
    });

    it('should include currentContent in the generated input field', async () => {
      const project = projectService.create({ title: '输入记录测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '原始创意',
        currentContent: '编辑后的世界观内容',
      });

      expect(step.input).toContain('编辑后的世界观内容');
    });

    it('should throw when project status is not SETTING', async () => {
      const project = projectService.create({ title: 'IDEA阶段项目' });
      // project defaults to IDEA status

      await expect(
        service.generateSetting(project.id, { idea: 'test' }),
      ).rejects.toThrow(/status must be SETTING/);
    });
  });

  describe('confirmSetting', () => {
    it('should confirm setting and transition project from SETTING to OUTLINE', async () => {
      const project = projectService.create({ title: '确认测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await service.generateSetting(project.id, { idea: '测试创意' });

      const result = await service.confirmSetting(project.id);

      expect(result.phaseType).toBe('SETTING');
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmedAt).toBeInstanceOf(Date);

      const updated = projectService.findById(project.id);
      expect(updated!.status).toBe('OUTLINE');
    });

    it('should throw when no generated setting exists to confirm', async () => {
      const project = projectService.create({ title: '无设定' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await expect(service.confirmSetting(project.id)).rejects.toThrow(
        /No generated setting/,
      );
    });

    it('should throw when setting is already confirmed', async () => {
      const project = projectService.create({ title: '重复确认' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await service.generateSetting(project.id, { idea: '测试' });
      await service.confirmSetting(project.id);

      await expect(service.confirmSetting(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });
  });

  describe('getSettingByProjectId', () => {
    it('should retrieve the latest SETTING step for a project', async () => {
      const project = projectService.create({ title: '查询测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const generated = await service.generateSetting(project.id, {
        idea: '查询用创意',
      });

      const found = service.getSettingByProjectId(project.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(generated.id);
      expect(found!.output).toBe(generated.output);
    });

    it('should return null when no SETTING step exists', () => {
      const project = projectService.create({ title: '无设定步骤' });

      expect(service.getSettingByProjectId(project.id)).toBeNull();
    });
  });
});
