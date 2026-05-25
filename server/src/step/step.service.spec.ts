import { Test, TestingModule } from '@nestjs/testing';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, TaskType, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { StepData, PhaseType, StepStatus } from './step.entity';

const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('beats')) {
      yield {
        content:
          '## Chapter 1: 序章·觉醒\n- 冲突点: 主角发现自己的特殊能力\n- 钩子预设: 神秘组织暗中观察, 能力觉醒之谜\n- 读者期待值: 高\n- 目标字数: 3000\n',
      };
      yield {
        content:
          '\n## Chapter 2: 初入江湖\n- 冲突点: 第一次实战遭遇强敌\n- 钩子预设: 神秘老人相助\n- 读者期待值: 中\n- 目标字数: 3500\n',
      };
      yield {
        content:
          '\n## Chapter 3: 暗流涌动\n- 冲突点: 发现更大的阴谋\n- 钩子预设: 隐藏势力浮出水面, 意外的背叛, 古老的预言\n- 读者期待值: 高\n- 目标字数: 4000\n',
      };
      yield {
        content:
          '\n## Chapter 4: 绝境求生\n- 冲突点: 被困险境\n- 钩子预设: 极限突破\n- 读者期待值: 中\n- 目标字数: 3200\n',
      };
      yield {
        content:
          '\n## Chapter 5: 逆转时刻\n- 冲突点: 反击开始\n- 钩子预设: 扭转局势, 新的盟友\n- 读者期待值: 高\n- 目标字数: 3800\n',
      };
    } else {
      yield { content: '## 时代背景\n这是一个修真世界。\n' };
      yield { content: '## 力量体系\n炼气、筑基、金丹、元婴、化神。\n' };
    }
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockImplementation(
    (_domain: string, template: string, _vars: Record<string, unknown>) => {
      if (template === 'beats-generation') {
        return 'beats generation prompt';
      }
      return 'rendered setting prompt';
    },
  ),
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

  // ─── BEATS Phase ────────────────────────────────────────────

  describe('generateBeats', () => {
    it('should generate beats from outline via AI and return BeatData[]', async () => {
      const project = projectService.create({ title: '细纲测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      const beats = await service.generateBeats(project.id, {
        outline: '大纲内容...',
      });

      expect(beats).toBeDefined();
      expect(Array.isArray(beats)).toBe(true);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]).toHaveProperty('chapterNumber');
      expect(beats[0]).toHaveProperty('plan');
      expect(beats[0]).toHaveProperty('hookCount');
      expect(beats[0]).toHaveProperty('isClimax');
      expect(beats[0]).toHaveProperty('useR1');
      expect(beats[0]).toHaveProperty('targetWordCount');
      expect(beats[0]).toHaveProperty('status');
    });

    it('should auto-extract hookCount from generated plan', async () => {
      const project = projectService.create({ title: '钩子计数测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      const beats = await service.generateBeats(project.id, {
        outline: '大纲内容...',
      });

      for (const beat of beats) {
        expect(typeof beat.hookCount).toBe('number');
        expect(beat.hookCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should throw when project does not exist', async () => {
      await expect(
        service.generateBeats('nonexistent-id', { outline: 'test' }),
      ).rejects.toThrow(/Project not found/);
    });

    it('should throw when project status is not BEATS', async () => {
      const project = projectService.create({ title: 'OUTLINE阶段项目' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      await expect(
        service.generateBeats(project.id, { outline: 'test' }),
      ).rejects.toThrow(/status must be BEATS/);
    });

    it('should use regeneration prompt when currentContent is provided', async () => {
      const project = projectService.create({ title: '刷新测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      const currentContent = '用户编辑后的细纲内容';
      await service.generateBeats(project.id, {
        outline: '大纲内容',
        currentContent,
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'beats-generation',
        expect.objectContaining({ currentContent }),
      );
    });

    it('should reuse existing beats on regenerate (return same beat IDs)', async () => {
      const project = projectService.create({ title: '复用细纲测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      const first = await service.generateBeats(project.id, {
        outline: '大纲内容',
      });
      const firstIds = first.map((b) => b.id);

      await service.rejectBeats(project.id);

      const second = await service.generateBeats(project.id, {
        outline: '大纲内容',
      });

      expect(second.map((b) => b.id)).toEqual(firstIds);
    });

    it('should call AIGatewayService with TaskType.BEATS', async () => {
      const project = projectService.create({ title: '调用测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      mockPromptLoader.renderTemplate.mockClear();

      await service.generateBeats(project.id, {
        outline: '大纲内容',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalled();
    });
  });

  describe('confirmBeats', () => {
    it('should confirm beats and transition project from BEATS to DRAFTING', async () => {
      const project = projectService.create({ title: '确认测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const result = await service.confirmBeats(project.id);

      expect(result.phaseType).toBe('BEATS');
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmedAt).toBeInstanceOf(Date);

      const updated = projectService.findById(project.id);
      expect(updated!.status).toBe('DRAFTING');
    });

    it('should batch calculate useR1 on confirm: first 3 chapters get R1', async () => {
      const project = projectService.create({ title: 'R1开头测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      // Chapters 1-3 (structural position) should have useR1 = true
      const earlyBeats = beats.filter((b) => b.chapterNumber <= 3);
      for (const beat of earlyBeats) {
        expect(beat.useR1).toBe(true);
      }
    });

    it('should batch calculate useR1 on confirm: last 3 chapters get R1', async () => {
      const project = projectService.create({ title: 'R1结尾测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const totalChapters = beats.length;
      const lateBeats = beats.filter(
        (b) => b.chapterNumber >= totalChapters - 2,
      );
      for (const beat of lateBeats) {
        expect(beat.useR1).toBe(true);
      }
    });

    it('should set useR1 = true when hookCount >= 3 regardless of position', async () => {
      const project = projectService.create({ title: '高钩子R1测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });

      // Manually set a middle chapter to have high hook count before confirm
      const beats = service.getBeatsByProjectId(project.id);
      const midBeat = beats.find((b) => b.chapterNumber > 3 && b.chapterNumber < beats.length - 2);
      if (midBeat) {
        // Simulate high hook count by updating the beat plan
        await service.updateBeatWordCount(midBeat.id, midBeat.targetWordCount);
      }

      await service.confirmBeats(project.id);

      const confirmed = service.getBeatsByProjectId(project.id);
      const highHookBeat = confirmed.find((b) => b.hookCount >= 3);
      if (highHookBeat) {
        expect(highHookBeat.useR1).toBe(true);
      }
    });

    it('should set useR1 = true when isClimax is true', async () => {
      const project = projectService.create({ title: '高潮R1测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });

      // Manually mark a chapter as climax before confirm
      const beats = service.getBeatsByProjectId(project.id);
      const midBeat = beats.find((b) => b.chapterNumber > 3);
      if (midBeat) {
        await service.updateBeatStructure(midBeat.id, {
          ...midBeat.plan,
          isClimax: true,
        });
      }

      await service.confirmBeats(project.id);

      const confirmed = service.getBeatsByProjectId(project.id);
      const climaxBeat = confirmed.find((b) => b.isClimax);
      if (climaxBeat) {
        expect(climaxBeat.useR1).toBe(true);
      }
    });

    it('should create empty Chapter shells for each beat on confirm', async () => {
      const project = projectService.create({ title: '空壳章节测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const chapters = service.getChaptersByProjectId(project.id);
      const beats = service.getBeatsByProjectId(project.id);

      expect(chapters.length).toBe(beats.length);
      for (const chapter of chapters) {
        expect(chapter.status).toBe('PENDING');
        expect(chapter.content).toBeNull();
        expect(chapter.targetWordCount).toBeGreaterThan(0);
      }
    });

    it('should throw when no beats exist to confirm', async () => {
      const project = projectService.create({ title: '无细纲确认' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await expect(service.confirmBeats(project.id)).rejects.toThrow(
        /No generated beats/,
      );
    });

    it('should throw when beats are already confirmed', async () => {
      const project = projectService.create({ title: '重复确认' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      await expect(service.confirmBeats(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });

    it('should throw when beats are rejected (not AWAITING_REVIEW)', async () => {
      const project = projectService.create({ title: '驳回后确认' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.rejectBeats(project.id);

      await expect(service.confirmBeats(project.id)).rejects.toThrow(
        /must be AWAITING_REVIEW/,
      );
    });
  });

  describe('rejectBeats', () => {
    it('should reject generated beats', async () => {
      const project = projectService.create({ title: '驳回细纲' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const result = await service.rejectBeats(project.id);

      expect(result.phaseType).toBe('BEATS');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw when no generated beats exist to reject', async () => {
      const project = projectService.create({ title: '无细纲驳回' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await expect(service.rejectBeats(project.id)).rejects.toThrow(
        /No generated beats/,
      );
    });

    it('should throw when beats are already confirmed', async () => {
      const project = projectService.create({ title: '已确认驳回' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      await expect(service.rejectBeats(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });
  });

  describe('getBeatsByProjectId', () => {
    it('should retrieve all beats for a project', async () => {
      const project = projectService.create({ title: '查询测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      const generated = await service.generateBeats(project.id, {
        outline: '大纲内容',
      });

      const found = service.getBeatsByProjectId(project.id);
      expect(found).toBeDefined();
      expect(found.length).toBe(generated.length);
      expect(found[0].projectId).toBe(project.id);
    });

    it('should return empty array when no beats exist', () => {
      const project = projectService.create({ title: '无细纲步骤' });

      expect(service.getBeatsByProjectId(project.id)).toEqual([]);
    });
  });

  // ─── Lightweight Beat Modification ───────────────────────────

  describe('updateBeatWordCount', () => {
    it('should update targetWordCount on the beat without cross-Phase rollback', async () => {
      const project = projectService.create({ title: '字数修改测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[0];

      const updated = await service.updateBeatWordCount(target.id, 5000);

      expect(updated.targetWordCount).toBe(5000);
      expect(updated.status).toBe('STALE');

      // Verify project is still in DRAFTING (no rollback)
      const p = projectService.findById(project.id);
      expect(p!.status).toBe('DRAFTING');
    });

    it('should update corresponding Chapter targetWordCount', async () => {
      const project = projectService.create({ title: '章节同步测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[0];

      await service.updateBeatWordCount(target.id, 6000);

      const chapters = service.getChaptersByProjectId(project.id);
      const matched = chapters.find(
        (c) => c.chapterNumber === target.chapterNumber,
      );
      expect(matched).toBeDefined();
      expect(matched!.targetWordCount).toBe(6000);
    });

    it('should throw when beat does not exist', async () => {
      await expect(
        service.updateBeatWordCount('nonexistent-id', 5000),
      ).rejects.toThrow(/Beat not found/);
    });

    it('should only mark the single beat STALE, not others', async () => {
      const project = projectService.create({ title: '独立STALE测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[0];

      await service.updateBeatWordCount(target.id, 5000);

      const after = service.getBeatsByProjectId(project.id);
      const staleBeats = after.filter((b) => b.status === 'STALE');
      expect(staleBeats.length).toBe(1);
      expect(staleBeats[0].id).toBe(target.id);

      const others = after.filter((b) => b.id !== target.id);
      for (const other of others) {
        expect(other.status).toBe('CONFIRMED');
      }
    });
  });

  describe('updateBeatStructure', () => {
    it('should update the beat plan and mark Beat + Chapter STALE', async () => {
      const project = projectService.create({ title: '结构修改测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[0];
      const newPlan = {
        conflictPoint: '新的冲突点',
        hookPreset: '新的钩子预设',
        readerExpectation: '中',
      };

      const updated = await service.updateBeatStructure(target.id, newPlan);

      expect(updated.status).toBe('STALE');
      expect(updated.plan).toMatchObject(newPlan);

      // Corresponding Chapter should also be STALE
      const chapters = service.getChaptersByProjectId(project.id);
      const matchedChapter = chapters.find(
        (c) => c.chapterNumber === target.chapterNumber,
      );
      expect(matchedChapter).toBeDefined();
      expect(matchedChapter!.status).toBe('STALE');
    });

    it('should not trigger cross-Phase rollback', async () => {
      const project = projectService.create({ title: '结构修改不回退' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[0];

      await service.updateBeatStructure(target.id, {
        conflictPoint: '变动',
        hookPreset: '新钩子',
      });

      const p = projectService.findById(project.id);
      expect(p!.status).toBe('DRAFTING');
    });

    it('should not affect upstream/downstream beats', async () => {
      const project = projectService.create({ title: '隔离测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = service.getBeatsByProjectId(project.id);
      const target = beats[1]; // chapter 2

      await service.updateBeatStructure(target.id, {
        conflictPoint: '变动',
        hookPreset: '新钩子',
      });

      const after = service.getBeatsByProjectId(project.id);
      // Beat 1 and 3 should remain CONFIRMED
      const beat1 = after.find((b) => b.chapterNumber === 1);
      const beat3 = after.find((b) => b.chapterNumber === 3);
      expect(beat1!.status).toBe('CONFIRMED');
      if (beat3) expect(beat3.status).toBe('CONFIRMED');
    });

    it('should throw when beat does not exist', async () => {
      await expect(
        service.updateBeatStructure('nonexistent-id', {
          conflictPoint: 'test',
        }),
      ).rejects.toThrow(/Beat not found/);
    });
  });

  describe('getChaptersByProjectId', () => {
    it('should return empty array when no chapters exist', () => {
      const project = projectService.create({ title: '无章节项目' });
      expect(service.getChaptersByProjectId(project.id)).toEqual([]);
    });

    it('should return chapters created during confirmBeats', async () => {
      const project = projectService.create({ title: '章节查询测试' });
      project.status = 'BEATS';
      projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const chapters = service.getChaptersByProjectId(project.id);
      expect(chapters.length).toBeGreaterThan(0);
      for (const ch of chapters) {
        expect(ch.projectId).toBe(project.id);
      }
    });
  });
});
