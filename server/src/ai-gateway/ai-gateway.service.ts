import { Injectable, Inject } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';

export enum TaskType {
  IDEA = 'IDEA',
  SETTING = 'SETTING',
  OUTLINE = 'OUTLINE',
  BEATS = 'BEATS',
  CHAPTER_GENERATION = 'CHAPTER_GENERATION',
  CRITICAL_CHAPTER = 'CRITICAL_CHAPTER',
  CHAPTER_REWRITE = 'CHAPTER_REWRITE',
  CHAPTER_POLISH = 'CHAPTER_POLISH',
  INDEPENDENT_REVIEW = 'INDEPENDENT_REVIEW',
  FINGERPRINT_EXTRACTION = 'FINGERPRINT_EXTRACTION',
  FACTSHEET_UPDATE = 'FACTSHEET_UPDATE',
  CHANGE_ANALYSIS = 'CHANGE_ANALYSIS',
}

export interface AIGenerateRequest {
  taskType: TaskType;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerateChunk {
  content: string;
  done: boolean;
  modelUsed?: string;
  degraded?: boolean;
  failed?: boolean;
}

export const AI_MODEL_TOKEN = 'AI_MODEL_TOKEN';

export interface IChatModel {
  stream(input: string): AsyncIterable<{ content: string }>;
}

const MODEL_MAP: Record<TaskType, string> = {
  [TaskType.IDEA]: 'deepseek-r1',
  [TaskType.SETTING]: 'deepseek-r1',
  [TaskType.OUTLINE]: 'deepseek-r1',
  [TaskType.BEATS]: 'deepseek-r1',
  [TaskType.CRITICAL_CHAPTER]: 'deepseek-r1',
  [TaskType.CHAPTER_GENERATION]: 'deepseek-chat-v3',
  [TaskType.CHAPTER_REWRITE]: 'deepseek-chat-v3',
  [TaskType.CHAPTER_POLISH]: 'deepseek-chat-v3',
  [TaskType.INDEPENDENT_REVIEW]: 'deepseek-chat-v3',
  [TaskType.FINGERPRINT_EXTRACTION]: 'deepseek-chat-v3',
  [TaskType.FACTSHEET_UPDATE]: 'deepseek-chat-v3',
  [TaskType.CHANGE_ANALYSIS]: 'deepseek-chat-v3',
};

const FALLBACK_MAP: Record<string, string> = {
  'deepseek-chat-v3': 'deepseek-r1',
  'deepseek-r1': 'deepseek-chat-v3',
};

const CONTENT_GENERATION_TASKS: TaskType[] = [
  TaskType.CHAPTER_GENERATION,
  TaskType.CRITICAL_CHAPTER,
  TaskType.CHAPTER_REWRITE,
  TaskType.CHAPTER_POLISH,
];

const SKIP_ON_FAILURE_TASKS: TaskType[] = [
  TaskType.FINGERPRINT_EXTRACTION,
  TaskType.FACTSHEET_UPDATE,
  TaskType.CHANGE_ANALYSIS,
];

@Injectable()
export class AIGatewayService {
  constructor(
    @Inject(AI_MODEL_TOKEN) private readonly chatModel: IChatModel,
  ) {}

  getModelForTask(taskType: TaskType): string {
    return MODEL_MAP[taskType];
  }

  getFallbackModel(model: string): string | null {
    return FALLBACK_MAP[model] ?? null;
  }

  generate(request: AIGenerateRequest): Observable<AIGenerateChunk> {
    const primaryModel = this.getModelForTask(request.taskType);

    return new Observable<AIGenerateChunk>((subscriber) => {
      this.streamGenerate(
        request.taskType,
        primaryModel,
        request.prompt,
        primaryModel,
        false,
        subscriber,
      );
    });
  }

  private async streamGenerate(
    taskType: TaskType,
    model: string,
    prompt: string,
    modelUsed: string,
    degraded: boolean,
    subscriber: Subscriber<AIGenerateChunk>,
  ): Promise<void> {
    try {
      const stream = this.chatModel.stream(prompt);
      for await (const chunk of stream) {
        if (chunk.content) {
          subscriber.next({ content: chunk.content, done: false });
        }
      }
      subscriber.next({ content: '', done: true, modelUsed, degraded });
      subscriber.complete();
    } catch {
      const fallback = this.getFallbackModel(model);
      if (fallback && !degraded) {
        await this.streamGenerate(
          taskType,
          fallback,
          prompt,
          modelUsed,
          true,
          subscriber,
        );
        return;
      }
      this.handleBothModelsFailed(taskType, modelUsed, subscriber);
    }
  }

  private handleBothModelsFailed(
    taskType: TaskType,
    modelUsed: string,
    subscriber: Subscriber<AIGenerateChunk>,
  ): void {
    if (CONTENT_GENERATION_TASKS.includes(taskType)) {
      subscriber.error(
        new Error('AI 服务暂时不可用，请稍后重试'),
      );
    } else if (SKIP_ON_FAILURE_TASKS.includes(taskType)) {
      subscriber.next({
        content: '',
        done: true,
        modelUsed,
        degraded: true,
        failed: true,
      });
      subscriber.complete();
    } else {
      // Review or creative tasks: mark failed but complete gracefully
      subscriber.next({
        content: '',
        done: true,
        modelUsed,
        degraded: true,
        failed: true,
      });
      subscriber.complete();
    }
  }
}
