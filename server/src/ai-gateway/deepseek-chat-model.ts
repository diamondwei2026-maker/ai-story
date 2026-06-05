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

  async *stream(input: string, model?: string, maxTokens?: number): AsyncIterable<{ content: string }> {
    const resolvedModel = this.resolveModel(model);

    const stream = await this.client.chat.completions.create({
      model: resolvedModel,
      messages: [{ role: 'user', content: input }],
      stream: true,
      ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
    });

    let hasContent = false;
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as Record<string, unknown> | undefined;
      const c = delta?.content as string | undefined | null;
      const r = delta?.reasoning_content as string | undefined | null;
      if (c) {
        hasContent = true;
        yield { content: c };
      } else if (r && !hasContent) {
        // Keep stream alive during R1 thinking phase; empty string filtered downstream
        yield { content: '' };
      }
    }
  }

  async getNumTokens(text: string): Promise<number> {
    // CJK-aware heuristic: Chinese ~1.8 chars/token, ASCII ~4 chars/token
    // DeepSeek does not expose a token-counting endpoint; precise tokenizer abandoned
    // (no official DeepSeek tiktoken config available). This heuristic eliminates the
    // ~2.2× underestimation bias of the flat 4 chars/token approach for Chinese text.
    if (!text) return 0;
    let asciiCount = 0;
    let cjkCount = 0;
    for (const ch of text) {
      if (/[一-鿿　-〿＀-￯]/.test(ch)) {
        cjkCount++;
      } else {
        asciiCount++;
      }
    }
    return Math.round(asciiCount / 4 + cjkCount / 1.8);
  }
}
