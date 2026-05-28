import { Module } from '@nestjs/common';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService, AI_MODEL_TOKEN } from './ai-gateway.service';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';
import { ContextBudgetService } from './context-budget.service';
import { DeepSeekChatModel } from './deepseek-chat-model';

@Module({
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    PromptTemplateLoaderService,
    ContextBudgetService,
    {
      provide: AI_MODEL_TOKEN,
      useFactory: () => {
        return new DeepSeekChatModel({
          apiKey: process.env.DEEPSEEK_API_KEY ?? 'sk-placeholder',
        });
      },
    },
  ],
  exports: [AIGatewayService, PromptTemplateLoaderService, ContextBudgetService, AI_MODEL_TOKEN],
})
export class AIGatewayModule {}
