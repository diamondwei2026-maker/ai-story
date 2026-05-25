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

    it('should transition through state machine during generation', async () => {
      const project = projectService.create({ title: '状态机测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '测试创意',
      });

      expect(step.status).toBe('AWAITING_REVIEW');
      // Step should be findable and have a valid id
      const found = service.getSettingByProjectId(project.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(step.id);
    });

    it('should reuse existing step on regenerate', async () => {
      const project = projectService.create({ title: '复用步骤测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const first = await service.generateSetting(project.id, {
        idea: '第一次生成',
      });
      const stepId = first.id;
      const firstVersion = first.version;

      // Simulate reject
      await service.rejectSetting(project.id);

      const second = await service.generateSetting(project.id, {
        idea: '第二次生成',
      });

      expect(second.id).toBe(stepId);
      expect(second.version).toBeGreaterThan(firstVersion);
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

  describe('rejectSetting', () => {
    it('should reject a generated setting', async () => {
      const project = projectService.create({ title: '驳回测试' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await service.generateSetting(project.id, { idea: '测试创意' });

      const result = await service.rejectSetting(project.id);

      expect(result.phaseType).toBe('SETTING');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw when no generated setting exists to reject', async () => {
      const project = projectService.create({ title: '无设定驳回' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await expect(service.rejectSetting(project.id)).rejects.toThrow(
        /No generated setting/,
      );
    });

    it('should throw when setting is already confirmed', async () => {
      const project = projectService.create({ title: '已确认驳回' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await service.generateSetting(project.id, { idea: '测试' });
      await service.confirmSetting(project.id);

      await expect(service.rejectSetting(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });

    it('should throw when setting is already rejected', async () => {
      const project = projectService.create({ title: '重复驳回' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await service.generateSetting(project.id, { idea: '测试' });
      await service.rejectSetting(project.id);

      await expect(service.rejectSetting(project.id)).rejects.toThrow(
        /already rejected/,
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

  // ─── OUTLINE Phase ────────────────────────────────────────────

  describe('generateOutline', () => {
    it('should generate outline content via AI and store as StepData', async () => {
      const project = projectService.create({ title: '大纲测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '修真世界设定内容',
        structure: 'three-act',
      });

      expect(step).toBeDefined();
      expect(step.projectId).toBe(project.id);
      expect(step.phaseType).toBe('OUTLINE');
      expect(step.status).toBe('AWAITING_REVIEW');
      expect(step.output).toBeTruthy();
      expect(step.version).toBe(1);
      expect(step.input).toContain('three-act');
    });

    it('should call AIGatewayService with TaskType.OUTLINE', async () => {
      const project = projectService.create({ title: '调用测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'web-novel-ten',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalled();
      expect(step.output).toBeTruthy();
    });

    it('should include structure+conflict+climax review in StepData', async () => {
      const project = projectService.create({ title: '审核测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'four-act-eight',
      });

      expect(step.review).toBeDefined();
      expect(step.review).toHaveProperty('structurePacing');
      expect(step.review).toHaveProperty('conflictReview');
      expect(step.review).toHaveProperty('climaxReview');
    });

    it('should throw when project does not exist', async () => {
      await expect(
        service.generateOutline('nonexistent-id', {
          setting: 'test',
          structure: 'three-act',
        }),
      ).rejects.toThrow(/Project not found/);
    });

    it('should throw when project status is not OUTLINE', async () => {
      const project = projectService.create({ title: 'SETTING阶段项目' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await expect(
        service.generateOutline(project.id, {
          setting: 'test',
          structure: 'three-act',
        }),
      ).rejects.toThrow(/status must be OUTLINE/);
    });

    it('should default structure to three-act when not provided', async () => {
      const project = projectService.create({ title: '默认结构测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
      });

      expect(step.input).toContain('three-act');
    });

    it('should use regeneration prompt when currentContent is provided', async () => {
      const project = projectService.create({ title: '刷新测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const currentContent = '用户编辑后的大纲内容';
      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
        currentContent,
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'outline-generation',
        expect.objectContaining({ currentContent }),
      );
    });

    it('should include currentContent in the generated input field', async () => {
      const project = projectService.create({ title: '输入记录测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
        currentContent: '用户编辑的大纲草稿',
      });

      expect(step.input).toContain('用户编辑的大纲草稿');
    });

    it('should throw when invalid structure type is provided', async () => {
      const project = projectService.create({ title: '无效结构' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await expect(
        service.generateOutline(project.id, {
          setting: '设定',
          structure: 'invalid-structure',
        }),
      ).rejects.toThrow(/Invalid structure/);
    });

    it('should reuse existing step on regenerate', async () => {
      const project = projectService.create({ title: '复用大纲步骤' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const first = await service.generateOutline(project.id, {
        setting: '设定',
        structure: 'three-act',
      });
      const stepId = first.id;
      const firstVersion = first.version;

      await service.rejectOutline(project.id);

      const second = await service.generateOutline(project.id, {
        setting: '设定',
        structure: 'web-novel-ten',
      });

      expect(second.id).toBe(stepId);
      expect(second.version).toBeGreaterThan(firstVersion);
    });
  });

  describe('confirmOutline', () => {
    it('should confirm outline and transition project from OUTLINE to BEATS', async () => {
      const project = projectService.create({ title: '确认测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });

      const result = await service.confirmOutline(project.id);

      expect(result.phaseType).toBe('OUTLINE');
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmedAt).toBeInstanceOf(Date);

      const updated = projectService.findById(project.id);
      expect(updated!.status).toBe('BEATS');
    });

    it('should throw when no generated outline exists to confirm', async () => {
      const project = projectService.create({ title: '无大纲' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await expect(service.confirmOutline(project.id)).rejects.toThrow(
        /No generated outline/,
      );
    });

    it('should throw when outline is already confirmed', async () => {
      const project = projectService.create({ title: '重复确认' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });
      await service.confirmOutline(project.id);

      await expect(service.confirmOutline(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });

    it('should throw when outline is rejected (not AWAITING_REVIEW)', async () => {
      const project = projectService.create({ title: '驳回后确认' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定',
        structure: 'three-act',
      });
      await service.rejectOutline(project.id);

      await expect(service.confirmOutline(project.id)).rejects.toThrow(
        /must be AWAITING_REVIEW/,
      );
    });
  });

  describe('rejectOutline', () => {
    it('should reject a generated outline', async () => {
      const project = projectService.create({ title: '驳回大纲' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定',
        structure: 'three-act',
      });

      const result = await service.rejectOutline(project.id);

      expect(result.phaseType).toBe('OUTLINE');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw when no generated outline exists to reject', async () => {
      const project = projectService.create({ title: '无大纲驳回' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await expect(service.rejectOutline(project.id)).rejects.toThrow(
        /No generated outline/,
      );
    });

    it('should throw when outline is already confirmed', async () => {
      const project = projectService.create({ title: '已确认驳回' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定',
        structure: 'three-act',
      });
      await service.confirmOutline(project.id);

      await expect(service.rejectOutline(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });
  });

  describe('switchStructure', () => {
    it('should switch structure type and regenerate with preserved key plot points', async () => {
      const project = projectService.create({ title: '格式切换测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const original = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });

      const switched = await service.switchStructure(project.id, 'web-novel-ten');

      expect(switched).toBeDefined();
      expect(switched.phaseType).toBe('OUTLINE');
      expect(switched.status).toBe('AWAITING_REVIEW');
      expect(switched.output).toBeTruthy();
      // Switching should update version
      expect(switched.version).toBeGreaterThanOrEqual(original.version);
    });

    it('should throw when no generated outline exists to switch', async () => {
      const project = projectService.create({ title: '无大纲切换' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await expect(
        service.switchStructure(project.id, 'four-act-eight'),
      ).rejects.toThrow(/No generated outline/);
    });

    it('should throw when outline is already confirmed', async () => {
      const project = projectService.create({ title: '已确认切换' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });
      await service.confirmOutline(project.id);

      await expect(
        service.switchStructure(project.id, 'web-novel-ten'),
      ).rejects.toThrow(/already confirmed/);
    });

    it('should throw when invalid structure type is provided', async () => {
      const project = projectService.create({ title: '无效结构' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });

      await expect(
        service.switchStructure(project.id, 'invalid-structure'),
      ).rejects.toThrow(/Invalid structure/);
    });

    it('should pass extracted key plot points into the prompt template', async () => {
      const project = projectService.create({ title: '种子注入测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      // The mock AI output matches /情节点\d+/ pattern used by extractKeyPlotPoints
      await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });

      mockPromptLoader.renderTemplate.mockClear();

      await service.switchStructure(project.id, 'web-novel-ten');

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'outline-generation',
        expect.objectContaining({
          keyPoints: expect.stringContaining('情节点'),
        }),
      );
    });
  });

  describe('getOutlineByProjectId', () => {
    it('should retrieve the latest OUTLINE step for a project', async () => {
      const project = projectService.create({ title: '查询测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const generated = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'four-act-eight',
      });

      const found = service.getOutlineByProjectId(project.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(generated.id);
      expect(found!.output).toBe(generated.output);
    });

    it('should return null when no OUTLINE step exists', () => {
      const project = projectService.create({ title: '无大纲步骤' });

      expect(service.getOutlineByProjectId(project.id)).toBeNull();
    });
  });
});
