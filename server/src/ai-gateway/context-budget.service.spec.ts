import { Test, TestingModule } from '@nestjs/testing';
import { ContextBudgetService } from './context-budget.service';

describe('ContextBudgetService', () => {
  let service: ContextBudgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextBudgetService],
    }).compile();
    service = module.get<ContextBudgetService>(ContextBudgetService);
  });

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(service.estimateTokens('')).toBe(0);
    });

    it('should estimate ~1 token per 4 characters', () => {
      // 400 字符 ≈ 100 tokens
      const text = 'A'.repeat(400);
      const tokens = service.estimateTokens(text);
      expect(tokens).toBeGreaterThanOrEqual(90);
      expect(tokens).toBeLessThanOrEqual(110);
    });

    it('should handle Chinese text', () => {
      // 中文字符也按同样的字符比例估算
      const text = '长'.repeat(200);
      const tokens = service.estimateTokens(text);
      expect(tokens).toBeGreaterThan(40);
      expect(tokens).toBeLessThan(60);
    });
  });

  describe('trimToBudget', () => {
    it('should return original text when within budget', () => {
      const text = 'short text';
      const result = service.trimToBudget(text, 100);
      expect(result).toBe(text);
    });

    it('should trim text to fit within token budget', () => {
      // 4000 字符 ≈ 1000 tokens, budget 只有 100 tokens
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

  describe('calculateBudget', () => {
    const withinLimits = {
      globalStatic: 'A'.repeat(400),    // ~100 tokens, < 3000
      globalDynamic: 'B'.repeat(400),   // ~100 tokens, < 2000
      local: 'C'.repeat(400),           // ~100 tokens, < 3000
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
      const tooLong = 'S'.repeat(20000); // ~5000 tokens
      const result = service.calculateBudget(tooLong, '', '');
      const tokens = service.estimateTokens(result.globalStatic);
      expect(tokens).toBeLessThanOrEqual(3000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should trim globalDynamic exceeding 2000 tokens', () => {
      const tooLong = 'D'.repeat(12000); // ~3000 tokens
      const result = service.calculateBudget('', tooLong, '');
      const tokens = service.estimateTokens(result.globalDynamic);
      expect(tokens).toBeLessThanOrEqual(2000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should trim local exceeding 3000 tokens', () => {
      const tooLong = 'L'.repeat(20000); // ~5000 tokens
      const result = service.calculateBudget('', '', tooLong);
      const tokens = service.estimateTokens(result.local);
      expect(tokens).toBeLessThanOrEqual(3000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should enforce total budget ≤ 8000 when all three exceed individual limits', () => {
      // 每个都超过各自上限，总计远超 8000
      const globalStatic = 'S'.repeat(20000);  // ~5000 tokens
      const globalDynamic = 'D'.repeat(12000); // ~3000 tokens
      const local = 'L'.repeat(20000);         // ~5000 tokens
      const result = service.calculateBudget(globalStatic, globalDynamic, local);

      const totalTokens =
        service.estimateTokens(result.globalStatic) +
        service.estimateTokens(result.globalDynamic) +
        service.estimateTokens(result.local);

      expect(totalTokens).toBeLessThanOrEqual(8000);
      expect(service.estimateTokens(result.globalStatic)).toBeLessThanOrEqual(3000);
      expect(service.estimateTokens(result.globalDynamic)).toBeLessThanOrEqual(2000);
      expect(service.estimateTokens(result.local)).toBeLessThanOrEqual(3000);
    });

    it('should include budget breakdown in result', () => {
      const result = service.calculateBudget('A'.repeat(400), 'B'.repeat(400), 'C'.repeat(400));
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
});
