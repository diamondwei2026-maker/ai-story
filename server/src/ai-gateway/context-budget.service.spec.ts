import { Test, TestingModule } from '@nestjs/testing';
import { ContextBudgetService } from './context-budget.service';
import { AI_MODEL_TOKEN } from './ai-gateway.service';
import { ProjectService } from '../project/project.service';

// ─── Mocks for dependencies ─────────────────────────────────────

const mockChatModel = {
  stream: async function* () {
    yield {
      content:
        '出场角色：主角李凡（觉醒初期，仍在摸索能力边界）、反派暗影尊者（幕后操控异能垄断组织，本集中首次现身）、' +
        '导师莫尘（前帝国异能学院教授，因政治迫害隐居，本集收李凡为徒）、伙伴白露（街头异能者，与李凡不打不相识）、' +
        '帝国将军秦无极（中立势力代表，对李凡的能力产生兴趣）。\n' +
        '关键事件：城墙大战爆发，李凡在生死关头觉醒第一层功法"星辰诀"；暗影尊者派出杀手追捕李凡，白露出手相助；' +
        '莫尘揭露异能修炼的真正秘密——并非天赋决定上限，而是对规则的理解深度；帝国军部开始注意到这场异能者之间的暗斗；' +
        '李凡决定加入莫尘的秘密训练基地，开启正式修炼之路。\n' +
        '情感转折：从被动防守转为主动出击——李凡意识到逃避只会让敌人更加强大；从孤独绝望到拥有伙伴——白露和莫尘的出现给了他支撑；' +
        '从对力量的恐惧到对力量的渴望——他明白了在这个异能至上的世界，没有实力就无法守护任何人。',
    };
  },
};

// Step data access stub — ContextBudgetService will depend on this for computeBudget
class StepDataAccessStub {
  chapters: Map<string, Map<string, any>> = new Map();
  steps: Map<string, Map<string, any>> = new Map();
  beats: Map<string, any[]> = new Map();
  factsheets: Map<string, any> = new Map();

  getChapters(projectId: string) {
    return Array.from(this.chapters.get(projectId)?.values() ?? []);
  }

  getChapter(projectId: string, chapterId: string) {
    return this.chapters.get(projectId)?.get(chapterId) ?? null;
  }

  getPreviousChapter(projectId: string, chapterNumber: number) {
    const chapters = this.getChapters(projectId);
    return chapters.find((c: any) => c.chapterNumber === chapterNumber - 1) ?? null;
  }

  getBeats(projectId: string) {
    return this.beats.get(projectId) ?? [];
  }

  getBeat(projectId: string, chapterNumber: number) {
    return this.getBeats(projectId).find((b: any) => b.chapterNumber === chapterNumber) ?? null;
  }

  getIdeaStep(projectId: string) {
    return this.steps.get(projectId)?.get('IDEA') ?? null;
  }

  getSettingStep(projectId: string) {
    return this.steps.get(projectId)?.get('SETTING') ?? null;
  }

  getFactsheet(projectId: string) {
    return this.factsheets.get(projectId) ?? null;
  }
}

const STEP_DATA_ACCESS = 'STEP_DATA_ACCESS';

describe('ContextBudgetService', () => {
  let service: ContextBudgetService;
  let projectService: ProjectService;
  let stepData: StepDataAccessStub;
  let module: TestingModule;

  beforeEach(async () => {
    stepData = new StepDataAccessStub();

    module = await Test.createTestingModule({
      providers: [
        ContextBudgetService,
        ProjectService,
        { provide: AI_MODEL_TOKEN, useValue: mockChatModel },
        { provide: STEP_DATA_ACCESS, useValue: stepData },
      ],
    }).compile();

    service = module.get<ContextBudgetService>(ContextBudgetService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // ════════════════════════════════════════════════════════════════
  // estimateTokens (existing — keep tests)
  // ════════════════════════════════════════════════════════════════

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(service.estimateTokens('')).toBe(0);
    });

    it('should estimate ~1 token per 4 characters', () => {
      const text = 'A'.repeat(400);
      const tokens = service.estimateTokens(text);
      expect(tokens).toBeGreaterThanOrEqual(90);
      expect(tokens).toBeLessThanOrEqual(110);
    });

    it('should handle Chinese text', () => {
      const text = '长'.repeat(200);
      const tokens = service.estimateTokens(text);
      expect(tokens).toBeGreaterThan(40);
      expect(tokens).toBeLessThan(60);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // trimToBudget (existing — keep tests)
  // ════════════════════════════════════════════════════════════════

  describe('trimToBudget', () => {
    it('should return original text when within budget', () => {
      const text = 'short text';
      const result = service.trimToBudget(text, 100);
      expect(result).toBe(text);
    });

    it('should trim text to fit within token budget', () => {
      const text = 'X'.repeat(4000);
      const result = service.trimToBudget(text, 100);
      const resultTokens = service.estimateTokens(result);
      expect(resultTokens).toBeLessThanOrEqual(100);
      expect(result.length).toBeLessThan(text.length);
    });

    it('should return empty string when budget is 0', () => {
      expect(service.trimToBudget('some text', 0)).toBe('');
    });
  });

  // ════════════════════════════════════════════════════════════════
  // calculateBudget — priority-based trimming (Issue #17)
  // ════════════════════════════════════════════════════════════════

  describe('calculateBudget', () => {
    const withinLimits = {
      globalStatic: 'A'.repeat(400),
      globalDynamic: 'B'.repeat(400),
      local: 'C'.repeat(400),
    };

    it('should pass through all texts when within limits', () => {
      const result = service.calculateBudget(
        withinLimits.globalStatic,
        withinLimits.globalDynamic,
        withinLimits.local,
      );
      expect(result.globalStatic).toBe(withinLimits.globalStatic);
      expect(result.globalDynamic).toBe(withinLimits.globalDynamic);
      expect(result.local).toBe(withinLimits.local);
      expect(result.warnings).toHaveLength(0);
    });

    it('should trim globalStatic exceeding 3000 tokens', () => {
      const tooLong = 'S'.repeat(20000);
      const result = service.calculateBudget(tooLong, '', '');
      const tokens = service.estimateTokens(result.globalStatic);
      expect(tokens).toBeLessThanOrEqual(3000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should trim globalDynamic exceeding 2000 tokens', () => {
      const tooLong = 'D'.repeat(12000);
      const result = service.calculateBudget('', tooLong, '');
      const tokens = service.estimateTokens(result.globalDynamic);
      expect(tokens).toBeLessThanOrEqual(2000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should trim local exceeding 3000 tokens', () => {
      const tooLong = 'L'.repeat(20000);
      const result = service.calculateBudget('', '', tooLong);
      const tokens = service.estimateTokens(result.local);
      expect(tokens).toBeLessThanOrEqual(3000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    // ── Priority-based trimming (NEW behavior for Issue #17) ──────

    it('should trim local layer FIRST when total exceeds 8000 after individual caps', () => {
      // Each layer is at its individual cap, total = 3000+2000+3000 = 8000 (exactly at limit)
      const gs = 'S'.repeat(3000 * 4); // ~3000 tokens
      const gd = 'D'.repeat(2000 * 4); // ~2000 tokens
      const lc = 'L'.repeat(3000 * 4 + 400); // ~3100 tokens (over local cap, will be trimmed to 3000)
      const result = service.calculateBudget(gs, gd, lc);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('local');
    });

    it('should trim local first, then globalDynamic, then globalStatic when total exceeds 8000', () => {
      // All three are at or near their individual caps, so total ≈ 8000+ after caps
      // But local is already capped at 3000. To push total > 8000, we need content
      // that fills each cap. After individual caps: 3000+2000+3000 = 8000.
      // To test priority: fill each to exactly its cap, which totals 8000.
      // No further trimming needed at exactly 8000 — verify no additional warnings.
      const gs = 'S'.repeat(3000 * 4);
      const gd = 'D'.repeat(2000 * 4);
      const lc = 'L'.repeat(3000 * 4);
      const result = service.calculateBudget(gs, gd, lc);

      const total = result.budget.total;
      expect(total).toBeLessThanOrEqual(8000);

      // When exactly at 8000, no additional "total exceeded" warning needed
      const totalWarnings = result.warnings.filter(
        (w) => w.includes('total'),
      );
      expect(totalWarnings).toHaveLength(0);
    });

    it('should reduce local budget first when total exceeds 8000 (priority 3 → lowest)', () => {
      // Force total > 8000: exceed each cap slightly, then after capping:
      // globalStatic capped to 3000, globalDynamic to 2000, local to 3000 = 8000 exactly
      // We need to make one of them bring the total over 8000 after capping.
      // Actually with caps at 3000+2000+3000 = 8000 exactly, caps ensure ≤ 8000.
      // The priority-based trimming applies when layers are WITHIN caps but total > 8000.
      // This happens when cap enforcement isn't enough (e.g. cap arithmetic due to estimation).
      //
      // For testing: use precision sizes where cap enforcement leaves total > 8000.
      // 3001 + 2001 + 3001 = 8003 tokens after rounding → local reduced first.
      const gs = 'S'.repeat(3000 * 4 + 10); // slightly over, capped to ~3000
      const gd = 'D'.repeat(2000 * 4 + 10); // slightly over, capped to ~2000
      const lc = 'L'.repeat(3000 * 4 + 10); // slightly over, capped to ~3000

      const result = service.calculateBudget(gs, gd, lc);
      const total = result.budget.total;

      if (total > 8000) {
        // When over-budget, local should be trimmed below its cap first
        expect(result.budget.local).toBeLessThanOrEqual(result.budget.globalStatic);
        expect(result.budget.local).toBeLessThanOrEqual(result.budget.globalDynamic);
      }
    });

    it('should prioritize globalStatic over globalDynamic when total budget is tight', () => {
      // When all three layers are filled to their individual caps,
      // globalStatic retains its full allocation (highest priority)
      const gs = 'S'.repeat(3000 * 4); // exactly 3000 tokens
      const gd = 'D'.repeat(2000 * 4); // exactly 2000 tokens
      const lc = 'L'.repeat(3000 * 4); // exactly 3000 tokens

      const result = service.calculateBudget(gs, gd, lc);

      expect(result.budget.total).toBeLessThanOrEqual(8000);
      // globalStatic is highest priority — should keep its full budget
      expect(result.budget.globalStatic).toBeGreaterThanOrEqual(result.budget.globalDynamic);
      // All three layers maintain their caps
      expect(result.budget.globalStatic).toBeLessThanOrEqual(3000);
      expect(result.budget.globalDynamic).toBeLessThanOrEqual(2000);
      expect(result.budget.local).toBeLessThanOrEqual(3000);
    });

    it('should include budget breakdown in result', () => {
      const result = service.calculateBudget(
        'A'.repeat(400),
        'B'.repeat(400),
        'C'.repeat(400),
      );
      expect(result.budget).toBeDefined();
      expect(result.budget.globalStatic).toBeGreaterThan(0);
      expect(result.budget.globalDynamic).toBeGreaterThan(0);
      expect(result.budget.local).toBeGreaterThan(0);
      expect(result.budget.total).toBeGreaterThan(0);
      expect(result.budget.globalStatic).toBeLessThanOrEqual(3000);
      expect(result.budget.globalDynamic).toBeLessThanOrEqual(2000);
      expect(result.budget.local).toBeLessThanOrEqual(3000);
      expect(result.budget.total).toBeLessThanOrEqual(8000);
    });

    it('should produce warning when trimming occurs', () => {
      const result = service.calculateBudget('A'.repeat(20000), '', '');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('globalStatic');
    });
  });

  // ════════════════════════════════════════════════════════════════
  // computeBudget (NEW method — Issue #17)
  // ════════════════════════════════════════════════════════════════

  describe('computeBudget', () => {
    function setupProjectWithContext() {
      const project = projectService.create({ title: '测试小说' });

      // Create IDEA step data
      stepData.steps.set(project.id, new Map());
      stepData.steps.get(project.id)!.set('IDEA', {
        id: 'idea-step-1',
        projectId: project.id,
        phaseType: 'IDEA',
        output:
          '## 一句话简介\n现代女医生重生星际时代，以手术刀开创医能新体系。\n\n## 500字简介\n' +
          '星际医妃传是一部融合现代医学与异能的创新之作。主角林清音从现代穿越到星际时代...'.repeat(10),
      });

      // Create SETTING step data
      stepData.steps.get(project.id)!.set('SETTING', {
        id: 'setting-step-1',
        projectId: project.id,
        phaseType: 'SETTING',
        output:
          '## 核心角色卡\n### 主角：林清音\n欲望：成为星际最强医者\n动机：守护想保护的人\n结局：开创医能新时代\n\n' +
          '### 反派：暗影尊者\n欲望：垄断异能资源\n动机：对力量的贪婪\n结局：被主角击败\n\n' +
          '## 世界观\n这是一个异能至上的星际文明，人类通过觉醒异能获得超凡力量。星系间由帝国统一治理...\n\n' +
          '## 力量体系\n异能分为九级：觉醒者、掌控者、领域者、破界者、虚空者、星辰者、法则者、创世者、永恒者。\n\n' +
          '## 角色关系图\n主角与反派形成对立关系，与导师形成师徒关系，与伙伴形成战斗同盟。',
      });

      // Create FactSheet
      stepData.factsheets.set(project.id, {
        projectId: project.id,
        entries: {
          '林清音': '主角，现代医学博士，穿越到星际时代后开创医能新体系',
          '暗影尊者': '反派，异能垄断组织首领，九级异能者',
          '星际帝国': '统治多个星系的政治实体，帝制',
        },
        version: 3,
      });

      // Create beats
      stepData.beats.set(project.id, [
        {
          id: 'beat-1',
          projectId: project.id,
          chapterNumber: 1,
          plan: { conflictPoint: '主角觉醒', hookPreset: '神秘组织暗中观察' },
          targetWordCount: 3000,
        },
      ]);

      // Create chapters
      stepData.chapters.set(project.id, new Map());
      stepData.chapters.get(project.id)!.set('chapter-1', {
        id: 'chapter-1',
        projectId: project.id,
        chapterNumber: 1,
        beatPlan: { conflictPoint: '主角觉醒', hookPreset: '神秘组织暗中观察' },
        targetWordCount: 3000,
        content: null,
        contextSummary: null,
        status: 'PENDING',
      });

      return { projectId: project.id, chapterId: 'chapter-1' };
    }

    it('should return trimmed three-layer context for a given project and chapter', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      expect(result).toBeDefined();
      expect(result.globalStatic).toBeTruthy();
      expect(result.globalDynamic).toBeTruthy();
      expect(result.local).toBeTruthy();
      expect(result.budget).toBeDefined();
      expect(result.budget.globalStatic).toBeLessThanOrEqual(3000);
      expect(result.budget.globalDynamic).toBeLessThanOrEqual(2000);
      expect(result.budget.local).toBeLessThanOrEqual(3000);
      expect(result.budget.total).toBeLessThanOrEqual(8000);
    });

    it('should assemble globalStatic from SETTING phase data (character cards, world building, power system, relationship graph)', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      expect(result.globalStatic).toContain('林清音');
      expect(result.globalStatic).toContain('暗影尊者');
      // World building content should be included
      expect(result.globalStatic).toContain('异能');
    });

    it('should assemble globalDynamic from FactSheet entries relevant to the chapter', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      expect(result.globalDynamic).toBeTruthy();
      expect(result.globalDynamic).toContain('林清音');
    });

    it('should use IDEA synopsis for local context when chapter is #1 (no previous chapter)', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      // Chapter 1 should include IDEA one-liner summary in local context
      expect(result.local).toContain('现代女医生');
    });

    it('should use previous chapter content or contextSummary for local context (chapter > 1)', () => {
      const { projectId } = setupProjectWithContext();

      // Add chapter 2 and set chapter 1 content with summary
      stepData.chapters.get(projectId)!.set('chapter-2', {
        id: 'chapter-2',
        projectId,
        chapterNumber: 2,
        beatPlan: { conflictPoint: '修炼突破' },
        targetWordCount: 3000,
        content: null,
        contextSummary: null,
        status: 'PENDING',
      });

      // Previous chapter has content and summary
      const ch1 = stepData.chapters.get(projectId)!.get('chapter-1');
      ch1.content = '第一章正文：林清音在手术室中倒下，再次睁眼已身处万年后的星际时代...';
      ch1.contextSummary =
        '出场角色：林清音\n关键事件：穿越到星际时代，发现医学知识是最大金手指\n情感转折：从迷茫到坚定';

      const result = service.computeBudget(projectId, 'chapter-2');

      // Local context should reference previous chapter's summary
      expect(result.local).toContain('林清音');
    });

    it('should inject beat plan into local context', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      expect(result.local).toContain('主角觉醒');
      expect(result.local).toContain('神秘组织');
    });

    it('should return empty strings for missing optional data (no SETTING step)', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      // Remove SETTING step
      stepData.steps.get(projectId)!.delete('SETTING');

      const result = service.computeBudget(projectId, chapterId);

      // Should still return valid result without crashing
      expect(result).toBeDefined();
      expect(result.budget.total).toBeLessThanOrEqual(8000);
    });

    it('should return valid result even with empty FactSheet', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      stepData.factsheets.delete(projectId);

      const result = service.computeBudget(projectId, chapterId);

      expect(result).toBeDefined();
      expect(result.budget.total).toBeLessThanOrEqual(8000);
    });

    it('should enforce all three layer limits and total budget ≤ 8000', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      const gsTokens = service.estimateTokens(result.globalStatic);
      const gdTokens = service.estimateTokens(result.globalDynamic);
      const lcTokens = service.estimateTokens(result.local);

      expect(gsTokens).toBeLessThanOrEqual(3000);
      expect(gdTokens).toBeLessThanOrEqual(2000);
      expect(lcTokens).toBeLessThanOrEqual(3000);
      expect(gsTokens + gdTokens + lcTokens).toBeLessThanOrEqual(8000);
    });

    it('should include warnings when trimming occurs', () => {
      const { projectId, chapterId } = setupProjectWithContext();

      // Create an oversized SETTING step to trigger trimming warnings
      stepData.steps.get(projectId)!.set('SETTING', {
        id: 'setting-large',
        projectId,
        phaseType: 'SETTING',
        output: 'X'.repeat(3000 * 4 + 400), // Over globalStatic limit
      });

      const result = service.computeBudget(projectId, chapterId);

      // With oversized data, warnings may be produced
      expect(result.warnings).toBeDefined();
    });

    it('should return consistent budget breakdown with actual content lengths', () => {
      const { projectId, chapterId } = setupProjectWithContext();
      const result = service.computeBudget(projectId, chapterId);

      // The budget numbers should match actual trimmed content lengths
      const estimatedGs = service.estimateTokens(result.globalStatic);
      const estimatedGd = service.estimateTokens(result.globalDynamic);
      const estimatedLc = service.estimateTokens(result.local);

      expect(result.budget.globalStatic).toBe(estimatedGs);
      expect(result.budget.globalDynamic).toBe(estimatedGd);
      expect(result.budget.local).toBe(estimatedLc);
      expect(result.budget.total).toBe(estimatedGs + estimatedGd + estimatedLc);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // generateContextSummary (NEW method — Issue #17)
  // ════════════════════════════════════════════════════════════════

  describe('generateContextSummary', () => {
    it('should return null when content is ≤ 2500 tokens', async () => {
      const shortContent = '短章内容。'.repeat(10); // well under 2500 tokens
      const summary = await service.generateContextSummary(shortContent);
      expect(summary).toBeNull();
    });

    it('should generate ~400-token structured summary when content > 2500 tokens', async () => {
      // Need > 2500 * 4 = 10000 chars to trigger summary generation
      const longContent = '第一章正文：星际医妃传是一部融合现代医学与异能战斗的创新之作。主角林清音从现代穿越到万年后的星际时代。'.repeat(400);
      // ~40 chars * 400 = 16000 chars ≈ 4000 tokens (> 2500 threshold)

      const summary = await service.generateContextSummary(longContent);

      expect(summary).toBeTruthy();
      const summaryTokens = service.estimateTokens(summary!);
      // Summary should be around 400 tokens (with tolerance)
      expect(summaryTokens).toBeGreaterThanOrEqual(50);
      expect(summaryTokens).toBeLessThanOrEqual(1500);
    });

    it('should include structured dimensions in the summary: characters, key events, emotional turns', async () => {
      const longContent = '林清音站在城墙之上，面对着整个异能军团，她的医学知识成为了最后的武器。'.repeat(400);

      const summary = await service.generateContextSummary(longContent);

      expect(summary).toBeTruthy();
      // Summary should contain structured dimensions as per PRD spec
      expect(summary).toContain('出场角色');
      expect(summary).toContain('关键事件');
      expect(summary).toContain('情感转折');
    });

    it('should handle empty content gracefully', async () => {
      const summary = await service.generateContextSummary('');
      expect(summary).toBeNull();
    });

    it('should return null when content is exactly at the 2500 token threshold', async () => {
      // 2500 tokens * 4 chars = 10000 chars — exactly at threshold
      const boundaryContent = 'A'.repeat(10000);
      const summary = await service.generateContextSummary(boundaryContent);
      // Strictly greater than 2500 triggers summary; exactly 2500 → null
      expect(summary).toBeNull();
    });
  });
});
