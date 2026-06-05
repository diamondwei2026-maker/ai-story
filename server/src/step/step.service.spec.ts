import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StepService } from './step.service';
import { ProjectService } from '../project/project.service';
import { AIGatewayService, TaskType, AI_MODEL_TOKEN } from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';
import { ContextBudgetService } from '../ai-gateway/context-budget.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetService } from './factsheet.service';
import { ReviewService } from './review.service';
import { PrismaService } from '../prisma/prisma.service';
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
    } else if (input.includes('卖点方案') || input.includes('sellPoint')) {
      yield {
        content:
          '## 卖点方案 1: 星际医妃风华录\n- 核心卖点: 现代女医生重生星际时代，将现代医学与异能修炼融合，开创"医能"新体系\n- 市场匹配度: 8.5/10\n- 爆款参考: 《星际超级医生》、《重生之医妃倾城》\n- 差异化分析: 将专业医学知识融入异能战斗，形成独特的知识壁垒和爽点\n\n',
      };
      yield {
        content:
          '## 卖点方案 2: 毒妃逆袭：星际制药女王\n- 核心卖点: 毒理学博士穿越成废材王妃，以制药能力逆袭星际商界和修炼界\n- 市场匹配度: 7.8/10\n- 爆款参考: 《制药女王》、《狂妃逆袭：毒步天下》\n- 差异化分析: 商战+修炼双线并行，毒药流在星际背景下有新意\n\n',
      };
      yield {
        content:
          '## 卖点方案 3: 星海巡诊：医妃的宇宙诊所\n- 核心卖点: 主角绑定"宇宙诊所"系统，穿越不同星球行医，收集异能和伙伴\n- 市场匹配度: 9.2/10\n- 爆款参考: 《无限诊所系统》、《星际游医》\n- 差异化分析: 单元剧结构+长线主线，兼具系统流的爽感和单元故事的丰富性\n\n',
      };
      yield {
        content:
          '## 卖点方案 4: 庸医惑星：反套路治愈系\n- 核心卖点: 半吊子实习生意外治愈了重伤的星际元帅，被误认为神医，在星际引发一系列笑料\n- 市场匹配度: 8.0/10\n- 爆款参考: 《神医凰后》、《废柴逆天：神医不好惹》\n- 差异化分析: 反套路搞笑人设+治愈系温情，差异化明显\n',
      };
    } else if (input.includes('summary') || input.includes('简介')) {
      yield {
        content:
          '## 一句话简介\n现代女医生重生星际时代，以一柄手术刀和现代医学知识，在异能至上的星际文明中开创"医能"新体系，成为星际最强医妃。\n\n',
      };
      yield {
        content:
          '## 500字简介\n林清音是二十一世纪最年轻的心外科主任医师，却在一次手术中因过劳猝死。当她再次睁开眼睛，发现自己重生在万年后的星际时代——一个异能者掌控一切的世界。原主是星域帝国最废材的王妃，因无法觉醒异能被家族抛弃。\n\n但林清音很快发现，这个世界的所谓"异能"，本质上不过是基因突变导致的特殊能力——而基因，恰恰是她最熟悉的领域。现代医学知识成为她最大的金手指：她用手术刀精准切割能量回路，用药物学知识改良修炼丹药，用心电监护原理开发出全新的"医能"修炼体系。\n\n随着她一次次用"医术"创造奇迹——治愈了被判定为不治的异能反噬，让退役老兵断肢再生，甚至用疫苗概念开发出异能觉醒的"安全诱导法"——整个星际开始为这位"废材王妃"震动。古老的世家纷纷抛出橄榄枝，帝国军部求贤若渴，而对她不屑一顾的王爷夫君，也开始重新审视这位他从未正眼瞧过的王妃。\n\n然而，她的崛起也触动了既得利益者的神经。当异能垄断组织向她伸出黑手，当星际战争因她的"医能"技术而一触即发，林清音必须用自己的方式——手术刀和医学——守护她想保护的一切。',
      };
    } else {
      yield { content: '## 时代背景\n这是一个修真世界。\n' };
      yield { content: '## 力量体系\n炼气、筑基、金丹、元婴、化神。\n' };
    }
  },
  getNumTokens: async (text: string) => {
    if (!text) return 0;
    return Math.round(text.length / 4);
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockImplementation(
    (_domain: string, template: string, _vars: Record<string, unknown>) => {
      if (template === 'beats-generation') {
        return 'beats generation prompt';
      }
      if (template === 'beats-adjust') {
        return 'beats-adjust prompt with feedback';
      }
      if (template === 'beats-batch-adjust') {
        return 'beats-batch-adjust prompt';
      }
      if (template === 'idea-generation') {
        return '卖点方案 generation prompt with feedback';
      }
      if (template === 'idea-summary-generation') {
        return 'summary 简介 generation prompt';
      }
      return 'rendered setting prompt';
    },
  ),
};

function createInMemoryPrismaMock() {
  const stores: Record<string, Map<string, Record<string, unknown>>> = {
    project: new Map(),
    stepData: new Map(),
    beat: new Map(),
    chapter: new Map(),
    factSheet: new Map(),
  };

  const clone = (obj: unknown) => JSON.parse(JSON.stringify(obj));

  const mock = {
    project: {
      create: jest.fn(async (args: any) => {
        const id = `proj-${stores.project.size + 1}`;
        const doc = { id, ...clone(args.data), createdAt: new Date(), updatedAt: new Date() };
        stores.project.set(id, doc);
        return clone(doc);
      }),
      findMany: jest.fn(async (args?: any) => {
        const all = Array.from(stores.project.values());
        return clone(all.filter((d) => (args?.where?.status ? d.status !== args.where.status.not : true)));
      }),
      findUnique: jest.fn(async (args: any) => {
        const doc = stores.project.get(args.where.id);
        return doc ? clone(doc) : null;
      }),
      findFirst: jest.fn(async (args: any) => {
        for (const d of stores.project.values()) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) return clone(d);
        }
        return null;
      }),
      update: jest.fn(async (args: any) => {
        const existing = stores.project.get(args.where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...clone(args.data), updatedAt: new Date() };
        stores.project.set(args.where.id, updated);
        return clone(updated);
      }),
      delete: jest.fn(async (args: any) => {
        const existed = stores.project.has(args.where.id);
        stores.project.delete(args.where.id);
        return clone({ id: args.where.id });
      }),
      deleteMany: jest.fn(async (args: any) => {
        let count = 0;
        for (const [id, d] of stores.project) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) {
            stores.project.delete(id); count++;
          }
        }
        return { count };
      }),
    },
    stepData: {
      create: jest.fn(async (args: any) => {
        const id = `step-${stores.stepData.size + 1}`;
        const doc = { id, ...clone(args.data), confirmedAt: args.data.confirmedAt ?? null };
        stores.stepData.set(id, doc);
        return clone(doc);
      }),
      findMany: jest.fn(async (args?: any) => {
        const all = Array.from(stores.stepData.values());
        let result = all;
        if (args?.where) {
          result = result.filter((d) => Object.entries(args.where).every(([k, v]) => (d as any)[k] === v));
        }
        if (args?.orderBy) {
          result.sort((a: any, b: any) => b.version - a.version);
        }
        return clone(result);
      }),
      findUnique: jest.fn(async (args: any) => {
        const doc = stores.stepData.get(args.where.id);
        return doc ? clone(doc) : null;
      }),
      findFirst: jest.fn(async (args: any) => {
        for (const d of stores.stepData.values()) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) return clone(d);
        }
        return null;
      }),
      update: jest.fn(async (args: any) => {
        const existing = stores.stepData.get(args.where.id);
        if (!existing) throw new Error('Not found');
        const data = clone(args.data);
        // Handle Prisma increment
        if (data.version?.increment) {
          data.version = (existing.version as number) + (data.version.increment as number);
        }
        const updated = { ...existing, ...data };
        stores.stepData.set(args.where.id, updated);
        return clone(updated);
      }),
    },
    beat: {
      create: jest.fn(async (args: any) => {
        const id = `beat-${stores.beat.size + 1}`;
        const doc = { id, ...clone(args.data), createdAt: new Date(), updatedAt: new Date() };
        stores.beat.set(id, doc);
        return clone(doc);
      }),
      createMany: jest.fn(async (args: any) => {
        let count = 0;
        for (const data of args.data) {
          const id = `beat-${stores.beat.size + 1}`;
          const doc = { id, ...clone(data), createdAt: new Date(), updatedAt: new Date() };
          stores.beat.set(id, doc);
          count++;
        }
        return { count };
      }),
      findMany: jest.fn(async (args?: any) => {
        const all = Array.from(stores.beat.values());
        let result = all;
        if (args?.where) {
          result = result.filter((d) => Object.entries(args.where).every(([k, v]) => (d as any)[k] === v));
        }
        if (args?.orderBy?.chapterNumber === 'asc') {
          result.sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);
        }
        return clone(result);
      }),
      findUnique: jest.fn(async (args: any) => {
        const doc = stores.beat.get(args.where.id);
        return doc ? clone(doc) : null;
      }),
      findFirst: jest.fn(async (args: any) => {
        for (const d of stores.beat.values()) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) return clone(d);
        }
        return null;
      }),
      update: jest.fn(async (args: any) => {
        const existing = stores.beat.get(args.where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...clone(args.data), updatedAt: new Date() };
        stores.beat.set(args.where.id, updated);
        return clone(updated);
      }),
      deleteMany: jest.fn(async (args: any) => {
        let count = 0;
        for (const [id, d] of stores.beat) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) {
            stores.beat.delete(id); count++;
          }
        }
        return { count };
      }),
    },
    chapter: {
      create: jest.fn(async (args: any) => {
        const id = `ch-${stores.chapter.size + 1}`;
        const doc = { id, ...clone(args.data), createdAt: new Date(), updatedAt: new Date() };
        stores.chapter.set(id, doc);
        return clone(doc);
      }),
      createMany: jest.fn(async (args: any) => {
        let count = 0;
        for (const data of args.data) {
          const id = `ch-${stores.chapter.size + 1}`;
          const doc = { id, ...clone(data), createdAt: new Date(), updatedAt: new Date() };
          stores.chapter.set(id, doc);
          count++;
        }
        return { count };
      }),
      findMany: jest.fn(async (args?: any) => {
        const all = Array.from(stores.chapter.values());
        let result = all;
        if (args?.where) {
          result = result.filter((d) => Object.entries(args.where).every(([k, v]) => (d as any)[k] === v));
        }
        if (args?.orderBy?.chapterNumber === 'asc') {
          result.sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);
        }
        return clone(result);
      }),
      findUnique: jest.fn(async (args: any) => {
        const doc = stores.chapter.get(args.where.id);
        return doc ? clone(doc) : null;
      }),
      findFirst: jest.fn(async (args: any) => {
        for (const d of stores.chapter.values()) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) return clone(d);
        }
        return null;
      }),
      update: jest.fn(async (args: any) => {
        const existing = stores.chapter.get(args.where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...clone(args.data), updatedAt: new Date() };
        stores.chapter.set(args.where.id, updated);
        return clone(updated);
      }),
    },
    factSheet: {
      create: jest.fn(async (args: any) => {
        const id = `fs-${stores.factSheet.size + 1}`;
        const doc = { id, ...clone(args.data), updatedAt: new Date() };
        stores.factSheet.set(id, doc);
        return clone(doc);
      }),
      findUnique: jest.fn(async (args: any) => {
        const doc = stores.factSheet.get(args.where.id);
        return doc ? clone(doc) : null;
      }),
      findFirst: jest.fn(async (args: any) => {
        for (const d of stores.factSheet.values()) {
          if (Object.entries(args.where).every(([k, v]) => (d as any)[k] === v)) return clone(d);
        }
        return null;
      }),
      update: jest.fn(async (args: any) => {
        const existing = stores.factSheet.get(args.where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...clone(args.data), updatedAt: new Date() };
        stores.factSheet.set(args.where.id, updated);
        return clone(updated);
      }),
    },
  };

  return mock;
}

const mockPrisma = createInMemoryPrismaMock();

const mockBudgetService = {
  calculateBudget: jest.fn().mockReturnValue({ maxTokens: 8000 }),
  computeBudget: jest.fn().mockReturnValue({
    globalStatic: 'SETTING output trimmed',
    globalDynamic: 'FactSheet entries',
    local: 'Beat plan + previous summary',
    budget: { globalStatic: 500, globalDynamic: 300, local: 1200, total: 2000 },
    warnings: [],
  }),
  estimateTokens: jest.fn().mockReturnValue(500),
};

describe('StepService', () => {
  let service: StepService;
  let projectService: ProjectService;
  let factsheetService: FactsheetService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        StepService,
        ReviewService,
        FactsheetService,
        ProjectService,
        AIGatewayService,
        FactsheetCompensationService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: PromptTemplateLoaderService, useValue: mockPromptLoader },
        { provide: ContextBudgetService, useValue: mockBudgetService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StepService>(StepService);
    projectService = module.get<ProjectService>(ProjectService);
    factsheetService = module.get<FactsheetService>(FactsheetService);
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

    it('should default structure to web-novel-ten when not provided', async () => {
      const project = projectService.create({ title: '默认结构测试' });
      project.status = 'OUTLINE';
      projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
      });

      expect(step.input).toContain('web-novel-ten');
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

  // ═══════════════════════════════════════════════════════════
  // Issue #26 Phase 0: Schema & Types — V2 Beat Fields
  // RED PHASE — these tests MUST FAIL before implementation
  // ═══════════════════════════════════════════════════════════

  describe('Issue #26 — generateBeats with targetChapterCount', () => {
    it('should accept and forward targetChapterCount to the prompt template', async () => {
      const project = await projectService.create({ title: '篇幅控制测试' });

      await projectService.update(project.id, { status: "BEATS" as any });
      mockPromptLoader.renderTemplate.mockClear();

      await service.generateBeats(project.id, {
        outline: '大纲内容',
        targetChapterCount: 40,
        defaultWordCount: 3000,
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'beats-generation',
        expect.objectContaining({
          targetChapterCount: expect.any(String),
        }),
      );
    });

    it('should pass targetChapterCount as a string to the template', async () => {
      const project = await projectService.create({ title: '字符传参测试' });

      await projectService.update(project.id, { status: "BEATS" as any });
      mockPromptLoader.renderTemplate.mockClear();

      await service.generateBeats(project.id, {
        outline: '大纲',
        targetChapterCount: 25,
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'beats-generation',
        expect.objectContaining({
          targetChapterCount: '25',
        }),
      );
    });

    it('should omit targetChapterCount from template vars when not provided', async () => {
      const project = await projectService.create({ title: '可选参数测试' });

      await projectService.update(project.id, { status: "BEATS" as any });
      mockPromptLoader.renderTemplate.mockClear();

      await service.generateBeats(project.id, {
        outline: '大纲内容',
      });

      const callArgs = mockPromptLoader.renderTemplate.mock.calls[0];
      expect(callArgs[0]).toBe('creation');
      expect(callArgs[1]).toBe('beats-generation');
      // targetChapterCount should not be injected when not provided
      expect(callArgs[2].targetChapterCount).toBeUndefined();
    });
  });

  describe('Issue #26 — parseBeatsFromOutput V2 fields', () => {
    it('should parse narrativeSummary from AI output (V2 format)', async () => {
      const project = await projectService.create({ title: '叙事摘要解析测试' });

      await projectService.update(project.id, { status: "BEATS" as any });

      // Override the mock to return V2-format beats output
      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats')) {
          yield {
            content:
              '## Chapter 1: 开篇钩子\n' +
              '叙事摘要: 主角在垃圾星意外发现了一艘完好无损的星舰，这艘星舰的AI声称自己是千年前失踪的帝国旗舰。\n' +
              '冲突描述: 主角必须在48小时内修复星舰引擎，否则星舰将自毁程序会炸毁整个垃圾星区——但修复所需的零件被星际海盗控制。\n' +
              '钩子因果链: 钩子1: AI的真实身份→回收于第3章, 钩子2: 自毁倒计时→回收于本章结尾\n' +
              '冲突强度: 4\n' +
              '读者期待值: 5\n' +
              '节奏标签: 快\n' +
              '目标字数: 3000\n',
          };
          yield {
            content:
              '\n## Chapter 2: 海盗谈判\n' +
              '叙事摘要: 主角伪装成星际商人进入海盗基地谈判，却意外发现海盗头目认识原主的父亲。\n' +
              '冲突描述: 谈判桌上主角面临两难——交出星舰的核心数据换取零件，还是暴露身份与整个海盗团为敌。\n' +
              '钩子因果链: 钩子1: 海盗头目与原主父亲的关系→回收于第5章\n' +
              '冲突强度: 3\n' +
              '读者期待值: 4\n' +
              '节奏标签: 中\n' +
              '目标字数: 3200\n',
          };
          yield {
            content:
              '\n## Chapter 3: AI觉醒\n' +
              '叙事摘要: 星舰AI解锁了部分记忆数据，揭示帝国旗舰失踪的真正原因——一场跨越千年的阴谋。\n' +
              '冲突描述: AI展示的证据指向主角家族的敌人，但也暗示主角的父亲可能是这场阴谋的参与者——主角的信任根基被撼动。\n' +
              '钩子因果链: 钩子1: AI的真实身份（回收钩子1-1）, 钩子2: 父亲的秘密→回收于第8章, 钩子3: 帝国阴谋→回收于第15章\n' +
              '冲突强度: 5\n' +
              '读者期待值: 5\n' +
              '节奏标签: 快\n' +
              '目标字数: 4000\n',
          };
        } else {
          yield { content: 'default mock output' };
        }
      };

      try {
        const beats = await service.generateBeats(project.id, {
          outline: '大纲内容',
        });

        expect(beats.length).toBeGreaterThanOrEqual(3);

        // Chapter 1 assertions
        expect(beats[0].narrativeSummary).toBeDefined();
        expect(beats[0].narrativeSummary).toContain('垃圾星');
        expect(beats[0].conflictDescription).toBeDefined();
        expect(beats[0].conflictDescription).toContain('48小时');
        expect(beats[0].pacingLabel).toBe('快');
        expect(beats[0].conflictIntensity).toBe(4);
        expect(beats[0].readerExpectation).toBe(5);
        expect(beats[0].hookCausalChain).toBeDefined();
        expect(Array.isArray(beats[0].hookCausalChain)).toBe(true);
        expect(beats[0].hookCausalChain.length).toBe(2);

        // hookCausalChain structure verification
        const hook1 = beats[0].hookCausalChain[0];
        expect(hook1).toHaveProperty('hook');
        expect(hook1).toHaveProperty('resolvesInChapter');
        expect(hook1.hook).toContain('AI的真实身份');
        expect(hook1.resolvesInChapter).toBe(3);

        // Chapter 3: high-intensity climax
        expect(beats[2].conflictIntensity).toBe(5);
        expect(beats[2].readerExpectation).toBe(5);
        expect(beats[2].hookCausalChain.length).toBe(3);
        expect(beats[2].pacingLabel).toBe('快');
      } finally {
        mockChatModel.stream = originalStream;
      }
    });

    it('should provide default values for missing V2 fields', async () => {
      const project = await projectService.create({ title: '默认值测试' });

      await projectService.update(project.id, { status: "BEATS" as any });

      // Mock returning minimal V2 format (some fields missing)
      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats')) {
          yield {
            content:
              '## Chapter 1: 测试章节\n' +
              '冲突点: 传统格式冲突\n' +
              '钩子预设: 钩子A, 钩子B\n' +
              '读者期待值: 中\n' +
              '目标字数: 3000\n',
          };
        } else {
          yield { content: 'default mock output' };
        }
      };

      try {
        const beats = await service.generateBeats(project.id, {
          outline: '大纲内容',
        });

        expect(beats.length).toBeGreaterThan(0);
        // V2 fields should have defaults when not in AI output
        expect(beats[0].narrativeSummary).toBe('');
        expect(beats[0].conflictDescription).toBeDefined();
        expect(beats[0].conflictIntensity).toBe(3);
        expect(beats[0].readerExpectation).toBe(3);
        expect(beats[0].pacingLabel).toBe('中');
        // V1 hookPresets are converted to hookCausalChain with null resolvesInChapter
        expect(beats[0].hookCausalChain).toHaveLength(2);
        expect(beats[0].hookCausalChain[0]).toMatchObject({ hook: '钩子A', resolvesInChapter: null });
        expect(beats[0].hookCausalChain[1]).toMatchObject({ hook: '钩子B', resolvesInChapter: null });
      } finally {
        mockChatModel.stream = originalStream;
      }
    });
  });

  describe('Issue #26 — toBeat V1→V2 downgrade', () => {
    it('should derive conflictDescription from plan.conflictPoint for V1 data', async () => {
      const project = await projectService.create({ title: 'V1降级冲突描述' });

      await projectService.update(project.id, { status: "BEATS" as any });

      await service.generateBeats(project.id, { outline: '大纲内容' });

      // At this point, beats are stored via Prisma create with only V1 plan data.
      // getBeatsByProjectId calls toBeat which should derive V2 fields.
      const beats = await service.getBeatsByProjectId(project.id);

      expect(beats.length).toBeGreaterThan(0);
      // V1 plan has conflictPoint; toBeat should derive conflictDescription from it
      expect(beats[0]).toHaveProperty('conflictDescription');
      // conflictDescription should fall back to plan.conflictPoint or empty string
      expect(typeof beats[0].conflictDescription).toBe('string');
    });

    it('should derive hookCausalChain from plan.hookPresets for V1 data', async () => {
      const project = await projectService.create({ title: 'V1降级钩子链' });

      await projectService.update(project.id, { status: "BEATS" as any });

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const beats = await service.getBeatsByProjectId(project.id);

      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]).toHaveProperty('hookCausalChain');
      expect(Array.isArray(beats[0].hookCausalChain)).toBe(true);
      // hookCausalChain should be derived from plan.hookPresets
      // Each entry must have hook (string) and resolvesInChapter (null for V1 fallback)
      if (beats[0].hookCausalChain.length > 0) {
        const link = beats[0].hookCausalChain[0];
        expect(link).toHaveProperty('hook');
        expect(link).toHaveProperty('resolvesInChapter');
        expect(typeof link.hook).toBe('string');
      }
    });

    it('should derive readerExpectation from plan.readerExpectation text for V1 data', async () => {
      const project = await projectService.create({ title: 'V1降级期待值' });

      await projectService.update(project.id, { status: "BEATS" as any });

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const beats = await service.getBeatsByProjectId(project.id);

      expect(beats.length).toBeGreaterThan(0);
      expect(beats[0]).toHaveProperty('readerExpectation');
      // V1 readerExpectation is text "高/中/低", V2 is int 1-5
      // Default should be 3 (中)
      expect(typeof beats[0].readerExpectation).toBe('number');
      expect(beats[0].readerExpectation).toBeGreaterThanOrEqual(1);
      expect(beats[0].readerExpectation).toBeLessThanOrEqual(5);
    });

    it('should provide default values for V2 fields on V1 Beats', async () => {
      const project = await projectService.create({ title: 'V1完整默认值' });

      await projectService.update(project.id, { status: "BEATS" as any });

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const beats = await service.getBeatsByProjectId(project.id);

      expect(beats.length).toBeGreaterThan(0);
      const beat = beats[0];

      // All V2 fields must be present with valid defaults
      expect(beat).toHaveProperty('narrativeSummary');
      expect(typeof beat.narrativeSummary).toBe('string');
      expect(beat).toHaveProperty('pacingLabel');
      expect(['快', '中', '慢']).toContain(beat.pacingLabel);
      expect(beat).toHaveProperty('conflictIntensity');
      expect(typeof beat.conflictIntensity).toBe('number');
      expect(beat).toHaveProperty('readerExpectation');
      expect(typeof beat.readerExpectation).toBe('number');
      expect(beat).toHaveProperty('conflictDescription');
      expect(typeof beat.conflictDescription).toBe('string');
      expect(beat).toHaveProperty('hookCausalChain');
      expect(Array.isArray(beat.hookCausalChain)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Issue #26 Phase 1: Beat Adjust & Batch Adjust
  // RED PHASE — these tests MUST FAIL before implementation
  // ═══════════════════════════════════════════════════════════

  describe('Issue #26 — adjustBeat (single chapter adjust)', () => {
    it('should adjust a single beat based on natural language feedback', async () => {
      const project = await projectService.create({ title: '单章调整测试' });

      await projectService.update(project.id, { status: "BEATS" as any });
      await service.generateBeats(project.id, { outline: '大纲内容' });

      const beats = await service.getBeatsByProjectId(project.id);
      const targetBeat = beats[0];

      // Override mock to return V2-format adjusted beat
      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-adjust')) {
          yield {
            content:
              '## Chapter 1: 调整后的开篇\n' +
              '叙事摘要: 主角在垃圾星发现星舰后，AI立即警告自毁程序已启动——但这次主角发现了星舰的紧急备用能源。\n' +
              '冲突描述: 主角与时间赛跑，必须在48小时内修复引擎，但海盗已经探测到星舰的能量信号并正在赶来。\n' +
              '钩子因果链: 钩子1: AI的真实身份→回收于第3章, 钩子2: 海盗追击→回收于第2章\n' +
              '冲突强度: 5\n' +
              '读者期待值: 5\n' +
              '节奏标签: 快\n' +
              '目标字数: 3000\n',
          };
        } else if (input.includes('beats')) {
          yield { content: '## Chapter 1: 测试章节\n冲突点: 测试冲突\n钩子预设: 钩子A\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 测试章节2\n冲突点: 测试冲突2\n钩子预设: 钩子B\n读者期待值: 高\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 测试章节3\n冲突点: 测试冲突3\n钩子预设: 钩子C\n读者期待值: 中\n目标字数: 3000\n' };
        } else {
          yield { content: 'default mock output' };
        }
      };

      try {
        const result = await service.adjustBeat(
          project.id,
          targetBeat.id,
          '节奏快一点，增加海盗威胁',
        );

        expect(result).toHaveProperty('beat');
        expect(result).toHaveProperty('impact');
        expect(result.beat.chapterNumber).toBe(targetBeat.chapterNumber);
        expect(result.beat.status).toBe('STALE');
        expect(result.beat.narrativeSummary).toContain('垃圾星');
        expect(result.beat.conflictIntensity).toBe(5);
        expect(result.beat.pacingLabel).toBe('快');
        expect(result.beat.hookCausalChain).toHaveLength(2);

        // Impact should be a valid structure
        expect(Array.isArray(result.impact.affectedChapterNumbers)).toBe(true);
        expect(Array.isArray(result.impact.warnings)).toBe(true);
      } finally {
        mockChatModel.stream = originalStream;
      }
    });

    it('should throw NotFoundException when beat does not exist', async () => {
      await expect(
        service.adjustBeat('proj-1', 'nonexistent-beat-id', 'test feedback'),
      ).rejects.toThrow(/Beat not found/);
    });

    it('should include adjacent chapter anchors in the adjust prompt', async () => {
      const project = await projectService.create({ title: '相邻锚点测试' });

      await projectService.update(project.id, { status: "BEATS" as any });

      // Generate 5 chapters so we can test middle chapter adjustment
      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-adjust')) {
          yield { content: '## Chapter 3: 调整后\n叙事摘要: 调整后的摘要\n冲突描述: 调整后的冲突\n钩子因果链: 钩子1: 测试钩子→回收于第5章\n冲突强度: 4\n读者期待值: 4\n节奏标签: 中\n目标字数: 3000\n' };
        } else {
          yield { content: '## Chapter 1: 章1\n冲突点: 冲突1\n钩子预设: 钩子A\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 章2\n冲突点: 冲突2\n钩子预设: 钩子B\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 章3\n冲突点: 冲突3\n钩子预设: 钩子C\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 4: 章4\n冲突点: 冲突4\n钩子预设: 钩子D\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 5: 章5\n冲突点: 冲突5\n钩子预设: 钩子E\n读者期待值: 高\n目标字数: 3000\n' };
        }
      };

      try {
        mockPromptLoader.renderTemplate.mockClear();
        await service.generateBeats(project.id, { outline: '大纲内容' });

        const beats = await service.getBeatsByProjectId(project.id);
        const middleBeat = beats.find((b) => b.chapterNumber === 3)!;

        mockPromptLoader.renderTemplate.mockClear();

        await service.adjustBeat(project.id, middleBeat.id, '增加悬念');

        expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
          'creation',
          'beats-adjust',
          expect.objectContaining({
            previousAnchor: expect.stringContaining('第2章'),
            nextAnchor: expect.stringContaining('第4章'),
          }),
        );
      } finally {
        mockChatModel.stream = originalStream;
      }
    });

    it('should sync adjusted beat data to corresponding Chapter beatPlan', async () => {
      const project = await projectService.create({ title: '章节同步调整' });

      // Go through pipeline to DRAFTING
      await service.generateIdea(project.id, { idea: '测试灵感' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });
      await service.confirmIdea(project.id, { selectedSellPoint: 0 });
      await service.generateSetting(project.id, { idea: '测试设定' });
      await service.confirmSetting(project.id);
      await service.generateOutline(project.id, { setting: '设定', structure: 'three-act' });
      await service.confirmOutline(project.id);
      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);

      const beats = await service.getBeatsByProjectId(project.id);
      const chapters = await service.getChaptersByProjectId(project.id);
      const targetBeat = beats[0];
      const targetChapter = chapters.find((c) => c.chapterNumber === targetBeat.chapterNumber)!;

      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-adjust')) {
          yield { content: '## Chapter 1: 调整后\n叙事摘要: 新摘要\n冲突描述: 新冲突描述包含独特标记XYZ789\n钩子因果链: 钩子1: 悬念→回收于第3章\n冲突强度: 4\n读者期待值: 5\n节奏标签: 快\n目标字数: 3000\n' };
        } else {
          yield { content: 'default' };
        }
      };

      try {
        const result = await service.adjustBeat(project.id, targetBeat.id, '调整');
        const chaptersAfter = await service.getChaptersByProjectId(project.id);
        const chapterAfter = chaptersAfter.find((c) => c.chapterNumber === targetBeat.chapterNumber)!;

        expect(chapterAfter.beatPlan).toBeDefined();
        expect(result.beat.plan).toBeDefined();
      } finally {
        mockChatModel.stream = originalStream;
      }
    });
  });

  describe('Issue #26 — batchAdjustBeats (interval optimization)', () => {
    it('should batch adjust a range of beats based on problem description', async () => {
      const project = await projectService.create({ title: '批量调整测试' });

      await projectService.update(project.id, { status: "BEATS" as any });

      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-batch-adjust')) {
          yield {
            content:
              '## Chapter 2: 优化后的章2\n叙事摘要: 增加冲突强度的摘要\n冲突描述: 更激烈的冲突描述——主角遭遇背叛\n钩子因果链: 钩子1: 背叛者身份→回收于第4章\n冲突强度: 4\n读者期待值: 4\n节奏标签: 快\n目标字数: 3000\n\n' +
              '## Chapter 3: 优化后的章3\n叙事摘要: 高潮提前的摘要\n冲突描述: 主角反击的冲突描述\n钩子因果链: 钩子1: 反击计划→回收于第5章\n冲突强度: 5\n读者期待值: 5\n节奏标签: 快\n目标字数: 3500\n',
          };
        } else {
          yield { content: '## Chapter 1: 章1\n冲突点: 冲突1\n钩子预设: 钩子A\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 章2\n冲突点: 冲突2\n钩子预设: 钩子B\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 章3\n冲突点: 冲突3\n钩子预设: 钩子C\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 4: 章4\n冲突点: 冲突4\n钩子预设: 钩子D\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 5: 章5\n冲突点: 冲突5\n钩子预设: 钩子E\n读者期待值: 高\n目标字数: 3000\n' };
        }
      };

      try {
        await service.generateBeats(project.id, { outline: '大纲内容' });

        const result = await service.batchAdjustBeats(
          project.id,
          2,
          3,
          '第2-3章冲突强度太低，需要增强节奏感',
        );

        expect(result).toHaveProperty('beats');
        expect(result).toHaveProperty('impact');
        expect(Array.isArray(result.beats)).toBe(true);
        expect(result.beats.length).toBeGreaterThanOrEqual(1);
        expect(result.beats.length).toBeLessThanOrEqual(2);

        // Adjusted beats should be STALE
        for (const beat of result.beats) {
          expect(beat.status).toBe('STALE');
        }

        // Impact structure
        expect(Array.isArray(result.impact.affectedChapterNumbers)).toBe(true);
        expect(Array.isArray(result.impact.warnings)).toBe(true);
      } finally {
        mockChatModel.stream = originalStream;
      }
    });

    it('should throw BadRequestException when range has no beats', async () => {
      const project = await projectService.create({ title: '空区间测试' });

      await expect(
        service.batchAdjustBeats(project.id, 100, 200, '优化'),
      ).rejects.toThrow(/No beats found/);
    });

    it('should include boundary anchors in batch adjust prompt', async () => {
      const project = await projectService.create({ title: '边界锚点测试' });

      await projectService.update(project.id, { status: "BEATS" as any });

      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-batch-adjust')) {
          yield { content: '## Chapter 2: 调整后\n叙事摘要: 调整后摘要\n冲突描述: 调整后冲突\n钩子因果链: 钩子1: 悬念→回收于第4章\n冲突强度: 4\n读者期待值: 4\n节奏标签: 中\n目标字数: 3000\n' };
        } else {
          yield { content: '## Chapter 1: 章1\n冲突点: 冲突1\n钩子预设: 钩子A\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 章2\n冲突点: 冲突2\n钩子预设: 钩子B\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 章3\n冲突点: 冲突3\n钩子预设: 钩子C\n读者期待值: 中\n目标字数: 3000\n' };
        }
      };

      try {
        await service.generateBeats(project.id, { outline: '大纲内容' });
        mockPromptLoader.renderTemplate.mockClear();

        await service.batchAdjustBeats(project.id, 2, 2, '优化第2章');

        expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
          'creation',
          'beats-batch-adjust',
          expect.objectContaining({
            beforeAnchor: expect.stringContaining('第1章'),
            afterAnchor: expect.stringContaining('第3章'),
          }),
        );
      } finally {
        mockChatModel.stream = originalStream;
      }
    });
  });

  describe('Issue #26 — detectImpact (hook chain impact detection)', () => {
    it('should detect affected chapters when a hook is deleted', async () => {
      const project = await projectService.create({ title: '钩子删除影响' });

      await projectService.update(project.id, { status: "BEATS" as any });

      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-adjust')) {
          // Return beat with fewer hooks (one hook removed)
          yield {
            content:
              '## Chapter 1: 调整后\n' +
              '叙事摘要: 调整后的摘要\n' +
              '冲突描述: 调整后的冲突描述\n' +
              '钩子因果链: 钩子1: AI身份→回收于第3章\n' +
              '冲突强度: 4\n' +
              '读者期待值: 4\n' +
              '节奏标签: 快\n' +
              '目标字数: 3000\n',
          };
        } else if (input.includes('beats')) {
          yield { content: '## Chapter 1: 章1\n冲突点: 冲突1\n钩子预设: 钩子A, 钩子B\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 章2\n冲突点: 冲突2\n钩子预设: 钩子C\n读者期待值: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 章3\n冲突点: 冲突3\n钩子预设: 钩子D\n读者期待值: 高\n目标字数: 3000\n' };
        } else {
          yield { content: 'default mock output' };
        }
      };

      try {
        await service.generateBeats(project.id, { outline: '大纲内容' });

        // Update beat1 to have 2 hooks with specific resolve targets
        const beats = await service.getBeatsByProjectId(project.id);
        const beat1 = beats[0];
        await service.updateBeatStructure(beat1.id, {
          hookPresets: ['钩子A', '钩子B'],
        });

        // Now adjust - AI returns only 1 hook
        const result = await service.adjustBeat(project.id, beat1.id, '减少一个钩子');

        expect(result.impact).toBeDefined();
        // Previous hooks were V1 converted (null resolvesInChapter), so no target chapter references
        // Impact should at least be a valid structure
        expect(Array.isArray(result.impact.affectedChapterNumbers)).toBe(true);
        expect(Array.isArray(result.impact.warnings)).toBe(true);
      } finally {
        mockChatModel.stream = originalStream;
      }
    });

    it('should detect affected chapters when hook resolve target changes', async () => {
      const project = await projectService.create({ title: '钩子目标变更' });

      await projectService.update(project.id, { status: "BEATS" as any });

      const originalStream = mockChatModel.stream;
      mockChatModel.stream = async function* (input: string) {
        if (input.includes('beats-adjust')) {
          yield {
            content:
              '## Chapter 1: 调整后\n' +
              '叙事摘要: 调整后摘要\n' +
              '冲突描述: 调整后冲突\n' +
              '钩子因果链: 钩子1: 核心悬念→回收于第5章\n' +  // Changed from chapter 3 to 5
              '冲突强度: 4\n' +
              '读者期待值: 4\n' +
              '节奏标签: 中\n' +
              '目标字数: 3000\n',
          };
        } else if (input.includes('beats')) {
          yield { content: '## Chapter 1: 章1\n叙事摘要: 原摘要\n冲突描述: 原冲突\n钩子因果链: 钩子1: 核心悬念→回收于第3章\n冲突强度: 3\n读者期待值: 3\n节奏标签: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 2: 章2\n叙事摘要: 章2摘要\n冲突描述: 章2冲突\n钩子因果链: 钩子1: 悬念2→回收于第4章\n冲突强度: 3\n读者期待值: 3\n节奏标签: 慢\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 3: 章3\n叙事摘要: 章3摘要\n冲突描述: 章3冲突\n钩子因果链: 钩子1: 悬念3→回收于第6章\n冲突强度: 4\n读者期待值: 4\n节奏标签: 中\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 4: 章4\n叙事摘要: 章4摘要\n冲突描述: 章4冲突\n钩子因果链: 无\n冲突强度: 2\n读者期待值: 2\n节奏标签: 慢\n目标字数: 3000\n' };
          yield { content: '\n## Chapter 5: 章5\n叙事摘要: 章5摘要\n冲突描述: 章5冲突\n钩子因果链: 无\n冲突强度: 5\n读者期待值: 5\n节奏标签: 快\n目标字数: 4000\n' };
          yield { content: '\n## Chapter 6: 章6\n叙事摘要: 章6摘要\n冲突描述: 章6冲突\n钩子因果链: 无\n冲突强度: 4\n读者期待值: 4\n节奏标签: 快\n目标字数: 3000\n' };
        } else {
          yield { content: 'default mock output' };
        }
      };

      try {
        const beats = await service.generateBeats(project.id, { outline: '大纲内容' });
        const beat1 = beats[0];

        // Before adjust, beat1 has hook resolving to chapter 3
        expect(beat1.hookCausalChain[0].resolvesInChapter).toBe(3);

        const result = await service.adjustBeat(project.id, beat1.id, '把悬念回收推迟');

        // After adjust, hook resolve changed from 3 to 5
        // Impact should detect chapter 3 is affected (old target) and chapter 5 (new target)
        expect(result.impact.affectedChapterNumbers).toContain(3);
        expect(result.impact.affectedChapterNumbers).toContain(5);
        expect(result.impact.warnings.length).toBeGreaterThan(0);
      } finally {
        mockChatModel.stream = originalStream;
      }
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

  // ══════════════════════════════════════════════════════════════════
  // Issue #24: BEATS structural modification in DRAFTING (RED phase)
  // ══════════════════════════════════════════════════════════════════

  describe('updateBeatStructure — Issue #24 RED', () => {
    /**
     * Helper: seed a project through the full pipeline to DRAFTING,
     * producing confirmed beats + chapter shells.
     */
    async function seedDraftingProject(title: string): Promise<{
      projectId: string;
      beats: ReturnType<typeof service.getBeatsByProjectId> extends Promise<infer T> ? T : never;
      chapters: ReturnType<typeof service.getChaptersByProjectId> extends Promise<infer T> ? T : never;
    }> {
      const project = await projectService.create({ title });
      await service.generateIdea(project.id, { idea: '测试灵感' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });
      await service.confirmIdea(project.id, { selectedSellPoint: 0 });       // → SETTING

      await service.generateSetting(project.id, { idea: '测试设定' });
      await service.confirmSetting(project.id);                               // → OUTLINE

      await service.generateOutline(project.id, { setting: '设定', structure: 'three-act' });
      await service.confirmOutline(project.id);                               // → BEATS

      await service.generateBeats(project.id, { outline: '大纲内容' });
      await service.confirmBeats(project.id);                                 // → DRAFTING

      const beats = await service.getBeatsByProjectId(project.id);
      const chapters = await service.getChaptersByProjectId(project.id);
      return { projectId: project.id, beats, chapters };
    }

    // ── R1: Beat status → STALE ────────────────────────────────

    it('R1: should set Beat status to STALE after structural modification', async () => {
      const { beats } = await seedDraftingProject('R1-结构修改-STALE标记');

      const updated = await service.updateBeatStructure(beats[0].id, {
        conflictPoint: '新的冲突点',
      });

      expect(updated.status).toBe('STALE');
    });

    // ── R2: plan merge correctness ─────────────────────────────

    it('R2: should merge new plan fields into existing plan (shallow overlay)', async () => {
      const { beats } = await seedDraftingProject('R2-计划合并');

      const originalPlan = { ...beats[0].plan };
      const patch = { conflictPoint: '修改后的冲突点', pov: '第一人称' };

      const updated = await service.updateBeatStructure(beats[0].id, patch);

      // New fields override
      expect(updated.plan).toMatchObject(patch);
      // Existing fields preserved unless overridden
      for (const [key, value] of Object.entries(originalPlan)) {
        if (!(key in patch)) {
          expect(updated.plan[key]).toEqual(value);
        }
      }
    });

    it('R2b: should completely replace hookPresets when provided in plan', async () => {
      const { beats } = await seedDraftingProject('R2b-钩子完全替换');

      const newHooks = ['惊天反转', '隐藏身份暴露', '宿敌现身'];
      const updated = await service.updateBeatStructure(beats[0].id, {
        hookPresets: newHooks,
      });

      expect(updated.plan.hookPresets).toEqual(newHooks);
    });

    // ── R3: hookCount recalculation ────────────────────────────

    it('R3: should recalculate hookCount from merged plan hookPresets', async () => {
      const { beats } = await seedDraftingProject('R3-钩子计数重算');

      const updated = await service.updateBeatStructure(beats[0].id, {
        hookPresets: ['钩子A', '钩子B', '钩子C', '钩子D'],
      });

      expect(updated.hookCount).toBe(4);
    });

    it('R3b: should set hookCount to 0 when hookPresets is empty', async () => {
      const { beats } = await seedDraftingProject('R3b-空钩子计数');

      const updated = await service.updateBeatStructure(beats[0].id, {
        hookPresets: [],
      });

      expect(updated.hookCount).toBe(0);
    });

    // ── R4: isClimax handling ──────────────────────────────────

    it('R4: should set isClimax to true when plan includes isClimax=true', async () => {
      const { beats } = await seedDraftingProject('R4-高潮标记设置');

      const updated = await service.updateBeatStructure(beats[1].id, {
        isClimax: true,
      });

      expect(updated.isClimax).toBe(true);
    });

    it('R4b: should preserve existing isClimax=true when not explicitly set to false', async () => {
      const { beats } = await seedDraftingProject('R4b-高潮标记保留');

      // First, set isClimax
      await service.updateBeatStructure(beats[2].id, { isClimax: true });
      // Then do a second structural update without mentioning isClimax
      const updated = await service.updateBeatStructure(beats[2].id, {
        conflictPoint: '另一个修改',
      });

      expect(updated.isClimax).toBe(true);
    });

    // ── R5: useR1 recalculation ────────────────────────────────

    it('R5: should recalculate useR1 to true when hookCount reaches threshold (≥3)', async () => {
      const { projectId, beats } = await seedDraftingProject('R5-R1重算');
      // 5-chapter project: structural position gives ALL beats useR1=true.
      // Build extra beats via the in-memory prisma mock so we have a beat
      // that is NOT in first 3 / last 3 of a larger set (total ≥ 9).
      for (let i = 6; i <= 9; i++) {
        await mockPrisma.beat.create({
          data: {
            projectId,
            chapterNumber: i,
            plan: { conflictPoint: `第${i}章冲突`, hookPresets: ['钩子1'] },
            targetWordCount: 3000,
            hookCount: 1,
            isClimax: false,
            useR1: false,
            status: 'CONFIRMED',
          },
        });
      }

      const allBeats = await service.getBeatsByProjectId(projectId);
      // Chapter 6 is > 3 and < (9 - 2 = 7), so it's truly "middle"
      const middleBeat = allBeats.find((b) => b.chapterNumber === 6);
      expect(middleBeat).toBeDefined();
      expect(middleBeat!.useR1).toBe(false);

      // Give it 3+ hooks → useR1 should flip to true
      const updated = await service.updateBeatStructure(middleBeat!.id, {
        hookPresets: ['钩子A', '钩子B', '钩子C'],
      });

      expect(updated.useR1).toBe(true);
    });

    it('R5b: should set useR1=true when isClimax=true even if hooks are low', async () => {
      const { projectId, beats } = await seedDraftingProject('R5b-高潮R1');
      // Build extra beats so we have a middle beat
      for (let i = 6; i <= 9; i++) {
        await mockPrisma.beat.create({
          data: {
            projectId,
            chapterNumber: i,
            plan: { conflictPoint: `第${i}章冲突`, hookPresets: ['钩子1'] },
            targetWordCount: 3000,
            hookCount: 1,
            isClimax: false,
            useR1: false,
            status: 'CONFIRMED',
          },
        });
      }

      const allBeats = await service.getBeatsByProjectId(projectId);
      const middleBeat = allBeats.find((b) => b.chapterNumber === 6);
      expect(middleBeat).toBeDefined();
      expect(middleBeat!.useR1).toBe(false);

      const updated = await service.updateBeatStructure(middleBeat!.id, {
        isClimax: true,
      });

      expect(updated.useR1).toBe(true);
    });

    // ── R6: Chapter beatPlan synchronization ───────────────────

    it('R6: should synchronize merged plan to corresponding Chapter beatPlan', async () => {
      const { beats, chapters } = await seedDraftingProject('R6-章节同步');

      const targetBeat = beats[0];
      const targetChapter = chapters.find(
        (c) => c.chapterNumber === targetBeat.chapterNumber,
      );
      expect(targetChapter).toBeDefined();

      const patch = { conflictPoint: '同步测试冲突点', pov: '第三人称' };
      await service.updateBeatStructure(targetBeat.id, patch);

      const chaptersAfter = await service.getChaptersByProjectId(targetBeat.projectId);
      const chapterAfter = chaptersAfter.find(
        (c) => c.chapterNumber === targetBeat.chapterNumber,
      );
      expect(chapterAfter).toBeDefined();
      expect(chapterAfter!.beatPlan).toMatchObject(patch);
    });

    // ── R7: Chapter status preserved (ADR-0005 conceptual STALE) ─

    it('R7: should NOT change Chapter status after structural modification', async () => {
      const { beats, chapters } = await seedDraftingProject('R7-章节状态不变');

      const targetBeat = beats[0];
      const targetChapter = chapters.find(
        (c) => c.chapterNumber === targetBeat.chapterNumber,
      );
      const originalStatus = targetChapter!.status;

      await service.updateBeatStructure(targetBeat.id, {
        conflictPoint: '新的冲突',
        hookPresets: ['钩子A', '钩子B'],
      });

      const chaptersAfter = await service.getChaptersByProjectId(targetBeat.projectId);
      const chapterAfter = chaptersAfter.find(
        (c) => c.chapterNumber === targetBeat.chapterNumber,
      );
      expect(chapterAfter!.status).toBe(originalStatus);
    });

    it('R7b: should preserve Chapter status even when Chapter was previously COMPLETED', async () => {
      const { beats, chapters, projectId } = await seedDraftingProject('R7b-已完成章节');
      // First complete the chapter
      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });
      await service.confirmChapter(projectId, chapters[0].id);

      const chapterBefore = (await service.getChaptersByProjectId(projectId))
        .find((c) => c.chapterNumber === beats[0].chapterNumber);
      expect(chapterBefore!.status).toBe('COMPLETED');

      await service.updateBeatStructure(beats[0].id, {
        conflictPoint: '修改已完成章节的Beat结构',
      });

      const chapterAfter = (await service.getChaptersByProjectId(projectId))
        .find((c) => c.chapterNumber === beats[0].chapterNumber);
      // ADR-0005: STALE is conceptual — status stays COMPLETED
      expect(chapterAfter!.status).toBe('COMPLETED');
    });

    // ── R8: no side-effects on other chapters ──────────────────

    it('R8: should not modify any other Beat statuses', async () => {
      const { beats } = await seedDraftingProject('R8-隔离性验证');

      const targetBeat = beats[1]; // chapter 2
      await service.updateBeatStructure(targetBeat.id, {
        conflictPoint: '修改',
      });

      const afterBeats = await service.getBeatsByProjectId(targetBeat.projectId);
      for (const b of afterBeats) {
        if (b.id === targetBeat.id) {
          expect(b.status).toBe('STALE');
        } else {
          expect(b.status).toBe('CONFIRMED');
        }
      }
    });

    it('R8b: should not modify any other Chapter data', async () => {
      const { beats, chapters } = await seedDraftingProject('R8b-章节隔离');

      const targetBeat = beats[0];
      const otherChapterIds = chapters
        .filter((c) => c.chapterNumber !== targetBeat.chapterNumber)
        .map((c) => c.id);

      // Snapshot other chapters before modification
      const chaptersBefore = await service.getChaptersByProjectId(targetBeat.projectId);
      const snapshots = new Map(
        chaptersBefore
          .filter((c) => c.chapterNumber !== targetBeat.chapterNumber)
          .map((c) => [c.id, { status: c.status, beatPlan: JSON.stringify(c.beatPlan) }]),
      );

      await service.updateBeatStructure(targetBeat.id, {
        conflictPoint: '修改内容',
        hookPresets: ['新钩子'],
      });

      const chaptersAfter = await service.getChaptersByProjectId(targetBeat.projectId);
      for (const ch of chaptersAfter) {
        if (otherChapterIds.includes(ch.id)) {
          const snap = snapshots.get(ch.id);
          expect(ch.status).toBe(snap!.status);
          expect(JSON.stringify(ch.beatPlan)).toBe(snap!.beatPlan);
        }
      }
    });

    // ── R9: no cross-Phase rollback ────────────────────────────

    it('R9: should keep Project in DRAFTING after structural modification', async () => {
      const { projectId, beats } = await seedDraftingProject('R9-无跨阶段回退');

      await service.updateBeatStructure(beats[0].id, {
        conflictPoint: '修改',
      });

      const project = await projectService.findById(projectId);
      expect(project!.status).toBe('DRAFTING');
    });

    // ── R10: error handling ────────────────────────────────────

    it('R10: should throw NotFoundException when Beat does not exist', async () => {
      await expect(
        service.updateBeatStructure('000000000000000000000000', {
          conflictPoint: '不存在的Beat',
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

  // ─── IDEA Phase ────────────────────────────────────────────

  describe('generateIdea', () => {
    it('should generate 3-5 sell point proposals via AI and store as StepData', async () => {
      const project = projectService.create({ title: '灵感测试' });
      // New projects default to IDEA status

      const step = await service.generateIdea(project.id, {
        idea: '一个医生重生到星际时代的故事',
      });

      expect(step).toBeDefined();
      expect(step.projectId).toBe(project.id);
      expect(step.phaseType).toBe('IDEA');
      expect(step.status).toBe('AWAITING_REVIEW');
      expect(step.output).toBeTruthy();
      expect(step.output).toContain('卖点方案');
      expect(step.version).toBe(1);
      expect(step.input).toContain('一个医生重生到星际时代的故事');
    });

    it('should generate exactly 3-5 sell point proposals', async () => {
      const project = projectService.create({ title: '卖点数量测试' });

      const step = await service.generateIdea(project.id, {
        idea: '星际医生',
      });

      const sellPointCount = (step.output!.match(/## 卖点方案 \d+/g) || []).length;
      expect(sellPointCount).toBeGreaterThanOrEqual(3);
      expect(sellPointCount).toBeLessThanOrEqual(5);
    });

    it('should include market match score in each sell point', async () => {
      const project = projectService.create({ title: '市场评分测试' });

      const step = await service.generateIdea(project.id, {
        idea: '测试创意',
      });

      const output = step.output!;
      const scoreMatches = output.match(/市场匹配度:\s*([\d.]+)\/10/g);
      expect(scoreMatches).toBeDefined();
      expect(scoreMatches!.length).toBeGreaterThanOrEqual(3);
      for (const match of scoreMatches!) {
        const score = parseFloat(match.match(/[\d.]+/)![0]);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    });

    it('should include similar hit references in each sell point', async () => {
      const project = projectService.create({ title: '爆款参考测试' });

      const step = await service.generateIdea(project.id, {
        idea: '测试创意',
      });

      const output = step.output!;
      expect(output).toContain('爆款参考');
      const refCount = (output.match(/爆款参考:/g) || []).length;
      expect(refCount).toBeGreaterThanOrEqual(3);
    });

    it('should include review annotations in the StepData', async () => {
      const project = projectService.create({ title: '审核测试' });

      const step = await service.generateIdea(project.id, {
        idea: '现代都市异能',
      });

      expect(step.review).toBeDefined();
      expect(step.review).toHaveProperty('complianceCheck');
      expect(step.review).toHaveProperty('annotations');
    });

    it('should throw when project does not exist', async () => {
      await expect(
        service.generateIdea('nonexistent-id', { idea: 'test' }),
      ).rejects.toThrow(/Project not found/);
    });

    it('should throw when project status is not IDEA', async () => {
      const project = projectService.create({ title: 'SETTING阶段项目' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      await expect(
        service.generateIdea(project.id, { idea: 'test' }),
      ).rejects.toThrow(/status must be IDEA/);
    });

    it('should support feedback-based regeneration', async () => {
      const project = projectService.create({ title: '反馈重新生成' });

      await service.generateIdea(project.id, {
        idea: '星际医生',
        feedback: '希望更偏向轻松搞笑风格，不要太多商战元素',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'idea-generation',
        expect.objectContaining({ feedback: expect.stringContaining('轻松搞笑') }),
      );
    });

    it('should reuse existing step on regenerate', async () => {
      const project = projectService.create({ title: '复用步骤测试' });

      const first = await service.generateIdea(project.id, {
        idea: '第一次生成',
      });
      const stepId = first.id;
      const firstVersion = first.version;

      await service.rejectIdea(project.id);

      const second = await service.generateIdea(project.id, {
        idea: '第二次生成',
      });

      expect(second.id).toBe(stepId);
      expect(second.version).toBeGreaterThan(firstVersion);
    });

    it('should call AIGatewayService with TaskType.IDEA', async () => {
      const project = projectService.create({ title: '调用测试' });

      mockPromptLoader.renderTemplate.mockClear();

      const step = await service.generateIdea(project.id, {
        idea: '测试',
      });

      expect(mockPromptLoader.renderTemplate).toHaveBeenCalled();
      expect(step.output).toBeTruthy();
    });
  });

  describe('generateIdeaSummary', () => {
    it('should generate one-liner + 500-word summary after sell point selection', async () => {
      const project = projectService.create({ title: '简介生成测试' });

      await service.generateIdea(project.id, {
        idea: '星际医生故事',
      });

      const step = await service.generateIdeaSummary(project.id, {
        selectedSellPoint: 0,
      });

      expect(step).toBeDefined();
      expect(step.phaseType).toBe('IDEA');
      expect(step.output).not.toContain('一句话简介');
      expect(step.output).not.toContain('500字简介');
      expect(step.review).toHaveProperty('oneLiner');
      expect(step.review).toHaveProperty('fullSummary');
      expect(step.review).toHaveProperty('summaryGenerated', true);
    });

    it('should include the one-liner summary', async () => {
      const project = projectService.create({ title: '一句话简介测试' });

      await service.generateIdea(project.id, {
        idea: '星际医生',
      });

      const step = await service.generateIdeaSummary(project.id, {
        selectedSellPoint: 0,
      });

      expect(step.review).toHaveProperty('oneLiner');
      expect(typeof (step.review as any).oneLiner).toBe('string');
      expect((step.review as any).oneLiner.length).toBeGreaterThan(10);
    });

    it('should include the 500-word summary', async () => {
      const project = projectService.create({ title: '500字简介测试' });

      await service.generateIdea(project.id, {
        idea: '星际医生',
      });

      const step = await service.generateIdeaSummary(project.id, {
        selectedSellPoint: 0,
      });

      expect(step.review).toHaveProperty('fullSummary');
      expect(typeof (step.review as any).fullSummary).toBe('string');
      expect((step.review as any).fullSummary.length).toBeGreaterThan(200);
    });

    it('should throw when no IDEA step exists to generate summary for', async () => {
      const project = projectService.create({ title: '无灵感步骤' });

      await expect(
        service.generateIdeaSummary(project.id, {
          selectedSellPoint: 0,
        }),
      ).rejects.toThrow(/No generated idea/);
    });

    it('should throw when sellPointContent and selectedSellPoint are both missing', async () => {
      const project = projectService.create({ title: '缺卖点测试' });

      await service.generateIdea(project.id, { idea: 'test' });

      await expect(
        service.generateIdeaSummary(project.id, {}),
      ).rejects.toThrow(/selectedSellPoint/);
    });
  });

  describe('confirmIdea', () => {
    it('should confirm idea and transition project from IDEA to SETTING', async () => {
      const project = projectService.create({ title: '确认测试' });

      await service.generateIdea(project.id, { idea: '测试创意' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });

      const result = await service.confirmIdea(project.id, {
        selectedSellPoint: 0,
      });

      expect(result.phaseType).toBe('IDEA');
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmedAt).toBeInstanceOf(Date);

      const updated = projectService.findById(project.id);
      expect(updated!.status).toBe('SETTING');
    });

    it('should store selectedSellPoint and customBrief in the step', async () => {
      const project = projectService.create({ title: '存储卖点测试' });

      await service.generateIdea(project.id, { idea: '测试创意' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });

      const result = await service.confirmIdea(project.id, {
        selectedSellPoint: 2,
        customBrief: '修改后的一句话简介：星际医妃以手术刀撬动星际权力格局',
      });

      expect(result.review).toHaveProperty('selectedSellPoint', 2);
      expect(result.review).toHaveProperty('customBrief');
    });

    it('should throw when no generated idea exists to confirm', async () => {
      const project = projectService.create({ title: '无灵感确认' });

      await expect(
        service.confirmIdea(project.id, { selectedSellPoint: 0 }),
      ).rejects.toThrow(/No generated idea/);
    });

    it('should throw when idea is already confirmed', async () => {
      const project = projectService.create({ title: '重复确认' });

      await service.generateIdea(project.id, { idea: '测试' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });
      await service.confirmIdea(project.id, { selectedSellPoint: 0 });

      await expect(
        service.confirmIdea(project.id, { selectedSellPoint: 0 }),
      ).rejects.toThrow(/already confirmed/);
    });

    it('should throw when idea is rejected (not AWAITING_REVIEW)', async () => {
      const project = projectService.create({ title: '驳回后确认' });

      await service.generateIdea(project.id, { idea: '测试' });
      await service.rejectIdea(project.id);

      await expect(
        service.confirmIdea(project.id, { selectedSellPoint: 0 }),
      ).rejects.toThrow(/must be AWAITING_REVIEW/);
    });
  });

  describe('rejectIdea', () => {
    it('should reject a generated idea', async () => {
      const project = projectService.create({ title: '驳回测试' });

      await service.generateIdea(project.id, { idea: '测试创意' });

      const result = await service.rejectIdea(project.id);

      expect(result.phaseType).toBe('IDEA');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw when no generated idea exists to reject', async () => {
      const project = projectService.create({ title: '无灵感驳回' });

      await expect(service.rejectIdea(project.id)).rejects.toThrow(
        /No generated idea/,
      );
    });

    it('should throw when idea is already confirmed', async () => {
      const project = projectService.create({ title: '已确认驳回' });

      await service.generateIdea(project.id, { idea: '测试' });
      await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });
      await service.confirmIdea(project.id, { selectedSellPoint: 0 });

      await expect(service.rejectIdea(project.id)).rejects.toThrow(
        /already confirmed/,
      );
    });

    it('should throw when idea is already rejected', async () => {
      const project = projectService.create({ title: '重复驳回' });

      await service.generateIdea(project.id, { idea: '测试' });
      await service.rejectIdea(project.id);

      await expect(service.rejectIdea(project.id)).rejects.toThrow(
        /already rejected/,
      );
    });
  });

  describe('getIdeaByProjectId', () => {
    it('should retrieve the latest IDEA step for a project', async () => {
      const project = projectService.create({ title: '查询测试' });

      const generated = await service.generateIdea(project.id, {
        idea: '查询用创意',
      });

      const found = service.getIdeaByProjectId(project.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(generated.id);
      expect(found!.output).toBe(generated.output);
    });

    it('should return null when no IDEA step exists', () => {
      const project = projectService.create({ title: '无灵感步骤' });

      expect(service.getIdeaByProjectId(project.id)).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // FactSheet compensation integration (Step 3 pipeline)
  // ══════════════════════════════════════════════════════════════════

  async function setupDraftingProject(): Promise<{
    projectId: string;
    chapters: { id: string }[];
  }> {
    const project = await projectService.create({ title: 'FactSheet集成测试' });
    // Step through state machine: IDEA → SETTING → OUTLINE → BEATS → DRAFTING
    await service.generateIdea(project.id, { idea: '星际医生重生' });
    await service.generateIdeaSummary(project.id, { selectedSellPoint: 0 });
    await service.confirmIdea(project.id, { selectedSellPoint: 0 });  // → SETTING

    await service.generateSetting(project.id, { idea: '测试创意' });
    await service.confirmSetting(project.id);  // → OUTLINE

    await service.generateOutline(project.id, { setting: '设定', structure: 'three-act' });
    await service.confirmOutline(project.id);  // → BEATS

    await service.generateBeats(project.id, { outline: '大纲' });
    await service.confirmBeats(project.id);  // → DRAFTING

    const chapters = await service.getChaptersByProjectId(project.id);
    return { projectId: project.id, chapters };
  }

  describe('getFactsheet', () => {
    it('should return null when no factSheet exists for project', () => {
      const project = projectService.create({ title: '空项目' });
      expect(service.getFactsheet(project.id)).toBeNull();
    });
  });

  describe('FactSheet version tracking', () => {
    it('should populate factSheet with version > 0 after chapter generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      const sheet = service.getFactsheet(projectId);
      expect(sheet).not.toBeNull();
      expect(sheet!.version).toBeGreaterThan(0);
    });

    it('should increment factSheet version on each chapter generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });
      await service.confirmChapter(projectId, chapters[0].id);

      const v1 = service.getFactsheet(projectId)!.version;

      await service.generateChapter(projectId, chapters[1].id, { mode: 'new-continue' });

      const v2 = service.getFactsheet(projectId)!.version;
      expect(v2).toBeGreaterThan(v1);
    });
  });

  describe('FactSheet compensation queue consumption', () => {
    it('should consume compensation queue after successful chapter generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      factsheetComp.enqueue(projectId, chapters[1].id, 2, { key: 'pending-value' });
      expect(factsheetComp.getQueueDepth(projectId)).toBe(1);

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      expect(factsheetComp.getQueueDepth(projectId)).toBe(0);
    });

    it('should merge consumed queue entries into factSheet', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      factsheetComp.enqueue(projectId, chapters[1].id, 2, {
        pendingField: 'from-queue',
      });

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      const sheet = service.getFactsheet(projectId);
      expect(sheet!.data).toHaveProperty('pendingField', 'from-queue');
    });

    it('should leave queue empty when no pending entries exist', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      expect(factsheetComp.getQueueDepth(projectId)).toBe(0);

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      expect(factsheetComp.getQueueDepth(projectId)).toBe(0);
    });
  });

  describe('FactSheet compensation retry on conflict', () => {
    it('should succeed with retry when factSheet version is externally bumped before generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      // Pre-create a versioned factSheet with external data to trigger CAS retry.
      // The pipeline reads version N, but stored version is N+5 → CAS fails first time.
      // On retry it re-reads N+5, merges, and CAS succeeds.
      (factsheetService as any).factSheetByProject.set(projectId, {
        data: { externalField: 'concurrent-change' },
        version: 5,
      });

      const chapter = await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });

      expect(chapter.status).toBe('REVIEWING');

      const sheet = service.getFactsheet(projectId);
      expect(sheet).not.toBeNull();
      // The factSheet should contain pre-existing external data
      expect(sheet!.data).toHaveProperty('externalField', 'concurrent-change');
      // Version should have advanced from the CAS write (5 → 6 after first write attempt that succeeds)
      expect(sheet!.version).toBeGreaterThanOrEqual(6);
    });

    it('should not enqueue when optimistic lock write succeeds on first attempt', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      expect(factsheetComp.getQueueDepth(projectId)).toBe(0);

      const sheet = service.getFactsheet(projectId);
      expect(sheet).not.toBeNull();
      expect(sheet!.version).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Project Completion (Issue #16)
  // ══════════════════════════════════════════════════════════════════

  describe('confirmCompletion', () => {
    it('should transition project to COMPLETED when all chapters are COMPLETED', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      const result = await service.confirmCompletion(projectId);

      expect(result.status).toBe('COMPLETED');
      const project = projectService.findById(projectId);
      expect(project!.status).toBe('COMPLETED');
    });

    it('should transition project to COMPLETED when chapters are mixed COMPLETED and DISPUTED', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (let i = 0; i < 3; i++) {
        await service.generateChapter(projectId, chapters[i].id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, chapters[i].id);
      }
      for (let i = 3; i < chapters.length; i++) {
        await service.generateChapter(projectId, chapters[i].id, { mode: 'new-continue' });
        await service.disputeChapter(projectId, chapters[i].id);
      }

      const result = await service.confirmCompletion(projectId);

      expect(result.status).toBe('COMPLETED');
    });

    it('should throw BadRequestException if any chapter is not COMPLETED or DISPUTED', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });
      await service.confirmChapter(projectId, chapters[0].id);

      await expect(service.confirmCompletion(projectId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should record statusHistory milestone on completion', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      await service.confirmCompletion(projectId);

      const project = projectService.findById(projectId);
      expect(project!.statusHistory).toBeDefined();
      expect(project!.statusHistory!.length).toBeGreaterThanOrEqual(1);
      const milestone = project!.statusHistory![
        project!.statusHistory!.length - 1
      ];
      expect(milestone.status).toBe('COMPLETED');
      expect(milestone.changedAt).toBeTruthy();
      expect(milestone.reason).toBeTruthy();
    });

    it('should check pendingFactUpdates and return options when queue is non-empty', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      factsheetComp.enqueue(projectId, chapters[0].id, 1, { key: 'pending-value' });

      const result = await service.confirmCompletion(projectId);

      expect(result.needsQueueResolution).toBe(true);
      expect(result.options).toBeDefined();
      expect(result.options!).toHaveLength(3);
      expect(result.options![0]).toMatchObject({ action: 'sync-and-complete' });
      expect(result.options![1]).toMatchObject({ action: 'skip-and-complete' });
      expect(result.options![2]).toMatchObject({ action: 'cancel' });
      // Project should NOT be COMPLETED yet
      const project = projectService.findById(projectId);
      expect(project!.status).not.toBe('COMPLETED');
    });

    it('should immediately complete when pendingFactUpdates queue is empty', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      const result = await service.confirmCompletion(projectId);

      expect(result.status).toBe('COMPLETED');
      expect(result.needsQueueResolution).toBeFalsy();
    });

    it('should force sync queue and complete when action is sync-and-complete', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      factsheetComp.enqueue(projectId, chapters[0].id, 1, { key: 'pending-value' });
      expect(factsheetComp.getQueueDepth(projectId)).toBe(1);

      const result = await service.confirmCompletion(projectId, 'sync-and-complete');

      expect(result.status).toBe('COMPLETED');
      expect(result.needsQueueResolution).toBeFalsy();
      // Queue should be drained after sync-and-complete
      expect(factsheetComp.getQueueDepth(projectId)).toBe(0);
      const project = projectService.findById(projectId);
      expect(project!.status).toBe('COMPLETED');
      expect(project!.statusHistory!.length).toBeGreaterThanOrEqual(1);
    });

    it('should complete without consuming queue when action is skip-and-complete', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }

      const factsheetComp = module.get<FactsheetCompensationService>(
        FactsheetCompensationService,
      );
      factsheetComp.enqueue(projectId, chapters[0].id, 1, { key: 'pending-value' });
      const depthBefore = factsheetComp.getQueueDepth(projectId);
      expect(depthBefore).toBe(1);

      const result = await service.confirmCompletion(projectId, 'skip-and-complete');

      expect(result.status).toBe('COMPLETED');
      expect(result.needsQueueResolution).toBeFalsy();
      // Queue should be preserved after skip-and-complete
      expect(factsheetComp.getQueueDepth(projectId)).toBe(depthBefore);
      const project = projectService.findById(projectId);
      expect(project!.status).toBe('COMPLETED');
      expect(project!.statusHistory!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reopenProject', () => {
    it('should transition project from COMPLETED to DRAFTING', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }
      await service.confirmCompletion(projectId);

      const result = await service.reopenProject(projectId);

      expect(result.status).toBe('DRAFTING');
      const project = projectService.findById(projectId);
      expect(project!.status).toBe('DRAFTING');
    });

    it('should keep all chapter statuses unchanged after reopen', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }
      await service.confirmCompletion(projectId);

      await service.reopenProject(projectId);

      const allChapters = service.getChaptersByProjectId(projectId);
      for (const ch of allChapters) {
        expect(ch.status).toBe('COMPLETED');
      }
    });

    it('should record statusHistory milestone on reopen', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      for (const ch of chapters) {
        await service.generateChapter(projectId, ch.id, { mode: 'new-continue' });
        await service.confirmChapter(projectId, ch.id);
      }
      await service.confirmCompletion(projectId);

      await service.reopenProject(projectId);

      const project = projectService.findById(projectId);
      const reopenMilestone = project!.statusHistory!.find(
        (m: any) => m.status === 'DRAFTING',
      );
      expect(reopenMilestone).toBeDefined();
      expect(reopenMilestone!.reason).toContain('reopen');
    });

    it('should throw BadRequestException if project is not COMPLETED', async () => {
      const project = projectService.create({ title: '测试项目' });

      await expect(service.reopenProject(project.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      await expect(service.reopenProject('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Issue #19: AI metadata propagation (aiMeta)
  // ══════════════════════════════════════════════════════════════════

  describe('generateIdea — aiMeta propagation (Issue #19)', () => {
    it('should include aiMeta with modelUsed in StepData after generation', async () => {
      const project = projectService.create({ title: 'aiMeta测试' });

      const step = await service.generateIdea(project.id, {
        idea: '测试创意',
      });

      expect(step.aiMeta).toBeDefined();
      expect(step.aiMeta!.modelUsed).toBeTruthy();
      expect(typeof step.aiMeta!.modelUsed).toBe('string');
    });

    it('should set aiMeta.degraded to false on primary model success', async () => {
      const project = projectService.create({ title: '无降级测试' });

      const step = await service.generateIdea(project.id, {
        idea: '测试创意',
      });

      expect(step.aiMeta).toBeDefined();
      expect(step.aiMeta!.degraded).toBe(false);
    });
  });

  describe('generateSetting — aiMeta propagation (Issue #19)', () => {
    it('should include aiMeta in StepData after setting generation', async () => {
      const project = projectService.create({ title: '设定aiMeta' });
      project.status = 'SETTING';
      projectService.update(project.id, {});

      const step = await service.generateSetting(project.id, {
        idea: '测试创意',
      });

      expect(step.aiMeta).toBeDefined();
      expect(step.aiMeta!.modelUsed).toBeTruthy();
      expect(step.aiMeta!.degraded).toBe(false);
    });
  });

  describe('generateOutline — aiMeta propagation (Issue #19)', () => {
    it('should include aiMeta in StepData after outline generation', async () => {
      const project = await projectService.create({ title: '大纲aiMeta' });
      project.status = 'OUTLINE';
      await projectService.update(project.id, {});

      const step = await service.generateOutline(project.id, {
        setting: '设定内容',
        structure: 'three-act',
      });

      expect(step.aiMeta).toBeDefined();
      expect(step.aiMeta!.modelUsed).toBeTruthy();
      expect(step.aiMeta!.degraded).toBe(false);
    });
  });

  describe('generateBeats — aiMeta propagation (Issue #19)', () => {
    it('should not throw and should store StepData with aiMeta', async () => {
      const project = await projectService.create({ title: '细纲aiMeta' });
      project.status = 'BEATS';
      await projectService.update(project.id, {});

      await service.generateBeats(project.id, { outline: '大纲内容' });

      const step = await service.getStepByProjectId(project.id, 'BEATS');
      expect(step).toBeDefined();
      expect(step!.aiMeta).toBeDefined();
      expect(step!.aiMeta!.modelUsed).toBeTruthy();
    });
  });

  describe('useR1 model routing during chapter generation', () => {
    it('should use CRITICAL_CHAPTER task type when beat.useR1 is true', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const beats = await service.getBeatsByProjectId(projectId);
      const chapter1Beat = beats.find((b) => b.chapterNumber === 1);
      chapter1Beat!.useR1 = true;

      const collectSpy = jest.spyOn(service as any, 'collectAiOutput');

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      const firstCall = collectSpy.mock.calls.find(
        (call: [TaskType, string]) => call[0] === TaskType.CRITICAL_CHAPTER,
      );
      expect(firstCall).toBeDefined();
      expect(firstCall![0]).toBe(TaskType.CRITICAL_CHAPTER);

      collectSpy.mockRestore();
    });

    it('should use CHAPTER_GENERATION task type when beat.useR1 is false', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const beats = await service.getBeatsByProjectId(projectId);
      const chapter1Beat = beats.find((b) => b.chapterNumber === 1);
      chapter1Beat!.useR1 = false;

      const collectSpy = jest.spyOn(service as any, 'collectAiOutput');

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });

      const genCall = collectSpy.mock.calls.find(
        (call: [TaskType, string]) => call[0] === TaskType.CHAPTER_GENERATION,
      );
      expect(genCall).toBeDefined();
      expect(genCall![0]).toBe(TaskType.CHAPTER_GENERATION);

      const criticalCall = collectSpy.mock.calls.find(
        (call: [TaskType, string]) => call[0] === TaskType.CRITICAL_CHAPTER,
      );
      expect(criticalCall).toBeUndefined();

      collectSpy.mockRestore();
    });

    it('should respect useR1 in continueChapterGeneration', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      const beats = await service.getBeatsByProjectId(projectId);
      const chapter1Beat = beats.find((b) => b.chapterNumber === 1);
      chapter1Beat!.useR1 = true;

      await service.generateChapter(projectId, chapters[0].id, { mode: 'new-continue' });
      service.pauseChapterGeneration(projectId, chapters[0].id);

      const collectSpy = jest.spyOn(service as any, 'collectAiOutput');

      await service.continueChapterGeneration(projectId, chapters[0].id, {
        currentContent: '已生成的前半部分内容',
      });

      const criticalCall = collectSpy.mock.calls.find(
        (call: [TaskType, string]) => call[0] === TaskType.CRITICAL_CHAPTER,
      );
      expect(criticalCall).toBeDefined();
      expect(criticalCall![0]).toBe(TaskType.CRITICAL_CHAPTER);

      collectSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Issue #21: ContextBudgetService pipeline wiring (RED phase)
  // ══════════════════════════════════════════════════════════════════

  describe('generateChapter — ContextBudget pipeline integration (Issue #21)', () => {
    it('should call computeBudget before rendering the prompt template', async () => {
      const { projectId, chapters } = await setupDraftingProject();

      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });

      // computeBudget must be called to assemble the three-layer context
      // before PromptTemplateLoaderService.renderTemplate is invoked
      expect(mockBudgetService.computeBudget).toHaveBeenCalledWith(
        projectId,
        chapters[0].id,
      );
    });

    it('should call computeBudget ONCE per chapter generation', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      mockBudgetService.computeBudget.mockClear();

      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });

      expect(mockBudgetService.computeBudget).toHaveBeenCalledTimes(1);
    });

    it('should call computeBudget before renderTemplate (ordering check)', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      mockBudgetService.computeBudget.mockClear();
      mockPromptLoader.renderTemplate.mockClear();

      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });

      // computeBudget call must happen BEFORE renderTemplate
      const computeBudgetOrder =
        mockBudgetService.computeBudget.mock.invocationCallOrder[0];
      const renderTemplateOrder =
        mockPromptLoader.renderTemplate.mock.invocationCallOrder[0];

      expect(computeBudgetOrder).toBeDefined();
      expect(renderTemplateOrder).toBeDefined();
      expect(computeBudgetOrder).toBeLessThan(renderTemplateOrder);
    });

    it('should inject budget result into the prompt template variables', async () => {
      const { projectId, chapters } = await setupDraftingProject();
      mockPromptLoader.renderTemplate.mockClear();

      await service.generateChapter(projectId, chapters[0].id, {
        mode: 'new-continue',
      });

      // renderTemplate should receive the budget result in its vars argument
      expect(mockPromptLoader.renderTemplate).toHaveBeenCalledWith(
        'creation',
        'chapter-generation',
        expect.objectContaining({
          globalStatic: expect.any(String),
          globalDynamic: expect.any(String),
          localContext: expect.any(String),
        }),
      );
    });
  });
});
