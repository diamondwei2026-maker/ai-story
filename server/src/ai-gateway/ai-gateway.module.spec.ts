import { Test, TestingModule } from '@nestjs/testing';
import { AIGatewayModule } from './ai-gateway.module';
import { AIGatewayService, AI_MODEL_TOKEN } from './ai-gateway.service';
import { AIGatewayController } from './ai-gateway.controller';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';
import { ContextBudgetService } from './context-budget.service';

const mockChatModel = {
  stream: async function* () {
    yield { content: 'mock' };
  },
};

describe('AIGatewayModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AIGatewayModule],
    })
      .overrideProvider(AI_MODEL_TOKEN)
      .useValue(mockChatModel)
      .compile();
  });

  it('should provide AIGatewayService', () => {
    const service = module.get<AIGatewayService>(AIGatewayService);
    expect(service).toBeDefined();
    expect(typeof service.getModelForTask).toBe('function');
    expect(typeof service.generate).toBe('function');
  });

  it('should provide PromptTemplateLoaderService', () => {
    const service = module.get<PromptTemplateLoaderService>(
      PromptTemplateLoaderService,
    );
    expect(service).toBeDefined();
    expect(typeof service.loadTemplate).toBe('function');
    expect(typeof service.renderTemplate).toBe('function');
  });

  it('should provide ContextBudgetService', () => {
    const service = module.get<ContextBudgetService>(ContextBudgetService);
    expect(service).toBeDefined();
    expect(typeof service.estimateTokens).toBe('function');
    expect(typeof service.calculateBudget).toBe('function');
  });

  it('should register AIGatewayController', () => {
    const controller = module.get<AIGatewayController>(AIGatewayController);
    expect(controller).toBeDefined();
  });
});
