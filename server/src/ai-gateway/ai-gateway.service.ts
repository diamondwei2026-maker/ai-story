import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Observable, Subscriber, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';

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

export interface AiStreamResult {
  content: string;
  aiMeta: {
    modelUsed: string;
    degraded: boolean;
    failed?: boolean;
  };
}

export interface DegradationLogEntry {
  taskType: TaskType;
  originalModel: string;
  degradedModel: string;
  failureReason: string;
  timestamp: string;
}

export const AI_MODEL_TOKEN = 'AI_MODEL_TOKEN';

export interface IChatModel {
  stream(input: string, model?: string): AsyncIterable<{ content: string }>;
  getNumTokens(text: string): Promise<number>;
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

const BLOCKING_TASKS: TaskType[] = [
  TaskType.CHAPTER_GENERATION,
  TaskType.CRITICAL_CHAPTER,
  TaskType.CHAPTER_REWRITE,
  TaskType.CHAPTER_POLISH,
  TaskType.INDEPENDENT_REVIEW,
  TaskType.IDEA,
  TaskType.SETTING,
  TaskType.OUTLINE,
  TaskType.BEATS,
];

const SKIP_ON_FAILURE_TASKS: TaskType[] = [
  TaskType.FINGERPRINT_EXTRACTION,
  TaskType.FACTSHEET_UPDATE,
  TaskType.CHANGE_ANALYSIS,
];

@Injectable()
export class AIGatewayService {
  private degradationLogs: DegradationLogEntry[] = [];

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
      this.streamGenerateCore(
        request.taskType,
        primaryModel,
        request.prompt,
        primaryModel,
        false,
        subscriber,
        false,
      );
    });
  }

  callWithFallback(taskType: TaskType, prompt: string): Observable<AIGenerateChunk> {
    const primaryModel = this.getModelForTask(taskType);

    return new Observable<AIGenerateChunk>((subscriber) => {
      this.streamGenerateCore(
        taskType,
        primaryModel,
        prompt,
        primaryModel,
        false,
        subscriber,
        true,
      );
    });
  }

  getDegradationLogs(): DegradationLogEntry[] {
    return this.degradationLogs;
  }

  /**
   * 通用 AI 输出收集器 —— 将 Observable 流合并为完整字符串，同时返回模型元信息。
   * 替代各 Service 中重复出现的 lastValueFrom + toArray 模式。
   */
  async collectFullOutput(taskType: TaskType, prompt: string): Promise<AiStreamResult> {
    try {
      const chunks$ = this.callWithFallback(taskType, prompt);
      const chunks = await lastValueFrom(chunks$.pipe(toArray()));
      const lastChunk = chunks[chunks.length - 1];
      const content = chunks
        .filter((c) => !c.done && c.content)
        .map((c) => c.content)
        .join('');
      return {
        content,
        aiMeta: {
          modelUsed: lastChunk?.modelUsed ?? this.getModelForTask(taskType),
          degraded: lastChunk?.degraded ?? false,
          failed: lastChunk?.failed ?? false,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`AI 生成失败: ${msg}`);
    }
  }

  private async streamGenerateCore(
    taskType: TaskType,
    model: string,
    prompt: string,
    modelUsed: string,
    degraded: boolean,
    subscriber: Subscriber<AIGenerateChunk>,
    logDegradation: boolean,
  ): Promise<void> {
    try {
      await this.safeStreamIteration(subscriber, modelUsed, degraded, model, prompt);
    } catch (err) {
      const failureReason = err instanceof Error ? err.message : String(err);
      const fallback = this.getFallbackModel(model);
      if (fallback && !degraded) {
        if (logDegradation) {
          this.degradationLogs.push({
            taskType,
            originalModel: modelUsed,
            degradedModel: fallback,
            failureReason,
            timestamp: new Date().toISOString(),
          });
        }
        await this.streamGenerateCore(
          taskType,
          fallback,
          prompt,
          modelUsed,
          true,
          subscriber,
          logDegradation,
        );
        return;
      }
      this.handleBothModelsFailed(taskType, modelUsed, subscriber);
    }
  }

  private async safeStreamIteration(
    subscriber: Subscriber<AIGenerateChunk>,
    modelUsed: string,
    degraded: boolean,
    model: string,
    prompt: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`AI stream timeout for model ${model}`));
      }, 300000);

      (async () => {
        try {
          const stream = this.chatModel.stream(prompt, model);
          for await (const chunk of stream) {
            subscriber.next({ content: chunk.content, done: false });
          }
          clearTimeout(timeout);
          subscriber.next({ content: '', done: true, modelUsed, degraded });
          subscriber.complete();
          resolve();
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      })();
    });
  }

  private handleBothModelsFailed(
    taskType: TaskType,
    modelUsed: string,
    subscriber: Subscriber<AIGenerateChunk>,
  ): void {
    if (BLOCKING_TASKS.includes(taskType)) {
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
