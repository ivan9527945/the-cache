import Anthropic from '@anthropic-ai/sdk';
import { buildGhostPrompt } from './promptBuilder.js';
import { detectFailureMode, REGENERATION_HINTS } from './failureModes.js';
import { OPENING_LINE } from './systemPrompt.js';
import type { ChatMessage, GhostReply, UserFeatures } from './types.js';

const DEFAULT_MODEL = 'claude-opus-4-7';

const STOP_SEQUENCES = [
  '\n\n---',
  'As an AI',
  '作為一個 AI',
  '我是一個語言模型',
  '作為語言模型',
];

export interface GhostOptions {
  features: UserFeatures;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  maxRegenerations?: number;
}

export class Ghost {
  private readonly client: Anthropic;
  private readonly systemPrompt: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly maxRegenerations: number;

  constructor(opts: GhostOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.systemPrompt = buildGhostPrompt(opts.features);
    this.model = opts.model ?? DEFAULT_MODEL;
    this.maxTokens = opts.maxTokens ?? 500;
    this.temperature = opts.temperature ?? 0.75;
    this.maxRegenerations = opts.maxRegenerations ?? 2;
  }

  get opening(): string {
    return OPENING_LINE;
  }

  async chat(history: ChatMessage[]): Promise<GhostReply> {
    let attempt = 0;
    let regenerationHint: string | null = null;

    while (true) {
      const messages = regenerationHint
        ? [...history, { role: 'user' as const, content: regenerationHint }]
        : history;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stop_sequences: STOP_SEQUENCES,
        system: [
          {
            type: 'text',
            text: this.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: messages.map(({ role, content }) => ({ role, content })),
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      const check = detectFailureMode(text);

      if (!check.failed || attempt >= this.maxRegenerations) {
        return {
          text,
          regenerated: attempt > 0,
          stop_reason: response.stop_reason,
        };
      }

      attempt += 1;
      regenerationHint = REGENERATION_HINTS[check.mode!];
    }
  }
}
