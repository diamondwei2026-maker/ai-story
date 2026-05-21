import { Module } from '@nestjs/common';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService, AI_MODEL_TOKEN } from './ai-gateway.service';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';
import { ContextBudgetService } from './context-budget.service';

@Module({
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    PromptTemplateLoaderService,
    ContextBudgetService,
    {
      provide: AI_MODEL_TOKEN,
      useFactory: () => {
        const { ChatOpenRouter } = require('@langchain/openrouter');
        return new ChatOpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY ?? 'sk-placeholder',
        });
      },
    },
  ],
})
export class AIGatewayModule {}
