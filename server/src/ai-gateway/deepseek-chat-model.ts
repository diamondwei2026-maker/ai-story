import OpenAI from 'openai';
import { IChatModel } from './ai-gateway.service';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const MODEL_ALIASES: Record<string, string> = {
  'deepseek-r1': 'deepseek-reasoner',
  'deepseek-chat-v3': 'deepseek-chat',
  'deepseek-chat': 'deepseek-chat',
  'deepseek-reasoner': 'deepseek-reasoner',
};

export interface DeepSeekChatModelOptions {
  apiKey: string;
  defaultModel?: string;
}

export class DeepSeekChatModel implements IChatModel {
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(options: DeepSeekChatModelOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
    this.defaultModel = options.defaultModel ?? 'deepseek-chat';
  }

  private resolveModel(model?: string): string {
    const key = model ?? this.defaultModel;
    return MODEL_ALIASES[key] ?? key;
  }

  async *stream(input: string, model?: string): AsyncIterable<{ content: string }> {
    const resolvedModel = this.resolveModel(model);

    const stream = await this.client.chat.completions.create({
      model: resolvedModel,
      messages: [{ role: 'user', content: input }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield { content };
      }
    }
  }

  async getNumTokens(text: string): Promise<number> {
    if (!text) return 0;
    return Math.round(text.length / 4);
  }
}
