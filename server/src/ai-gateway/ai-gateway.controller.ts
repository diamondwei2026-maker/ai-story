import { Controller, Get, Param, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AIGatewayService,
  AIGenerateRequest,
  AIGenerateChunk,
  TaskType,
} from './ai-gateway.service';

export interface StreamStatus {
  taskId: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
}

interface MessageEvent {
  data: AIGenerateChunk;
  id?: string;
  type?: string;
}

@Controller('ai')
export class AIGatewayController {
  constructor(private readonly aiGateway: AIGatewayService) {}

  @Sse('generate')
  generate(
    @Query('taskType') taskType: string,
    @Query('prompt') prompt: string,
    @Query('maxTokens') maxTokens?: string,
    @Query('temperature') temperature?: string,
  ): Observable<MessageEvent> {
    const request: AIGenerateRequest = {
      taskType: taskType as TaskType,
      prompt,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
    };
    return this.aiGateway
      .generate(request)
      .pipe(map((chunk) => ({ data: chunk })));
  }

  @Get('stream/:taskId')
  getStreamStatus(@Param('taskId') taskId: string): StreamStatus {
    return {
      taskId,
      status: 'completed',
      progress: 100,
    };
  }
}
