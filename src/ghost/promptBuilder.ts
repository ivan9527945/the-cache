import { SYSTEM_PROMPT_TEMPLATE } from './systemPrompt.js';
import type { UserFeatures } from './types.js';

const SEPARATOR = '、';

function formatEmotionBreakdown(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return '(無資料)';
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return '(無資料)';
  return entries
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`)
    .join(SEPARATOR);
}

export function buildGhostPrompt(features: UserFeatures): string {
  const substitutions: Record<string, string> = {
    '{avg_sentence_length}': features.linguistic.avg_sentence_length.toString(),
    '{punctuation_pattern}': features.linguistic.punctuation_pattern,
    '{top_15_words}': features.linguistic.top_15_words.join(SEPARATOR),
    '{signature_phrases}': features.linguistic.signature_phrases.join(SEPARATOR),
    '{emoji_per_message}': features.emoji.frequency_per_message.toString(),
    '{top_emojis}': features.emoji.top_5.join(' '),
    '{paragraph_style}': features.linguistic.paragraph_style,
    '{tone}': features.linguistic.tone,
    '{top_people}': features.entities.top_people.slice(0, 5).join(SEPARATOR),
    '{stated_opinions}': features.opinions.stated_stances.join(SEPARATOR),
    '{interests}': features.interests.join(SEPARATOR),
    '{active_hours}': features.temporal.active_hours,
    '{emotion_breakdown}': formatEmotionBreakdown(features.sentiment.emotion_breakdown),
  };

  let prompt = SYSTEM_PROMPT_TEMPLATE;
  for (const [token, value] of Object.entries(substitutions)) {
    prompt = prompt.split(token).join(value);
  }

  const leftovers = prompt.match(/\{[a-z_]+\}/g);
  if (leftovers && leftovers.length > 0) {
    throw new Error(`buildGhostPrompt: 未填入的變數 ${leftovers.join(', ')}`);
  }

  return prompt;
}
