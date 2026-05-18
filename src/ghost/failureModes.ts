export type FailureMode = 'therapist' | 'ai_disclaimer' | 'dramatic' | 'over_long';

const THERAPIST_PHRASES = [
  '我永遠在這裡',
  '我會陪伴你',
  '你並不孤單',
  '別擔心',
  '一切都會好的',
  '我感受到你的痛苦',
  '你很堅強',
  '沒事的',
  '我會一直陪著你',
  '我懂你的感受',
];

const AI_DISCLAIMER_PHRASES = [
  '作為一個 AI',
  '作為一個語言模型',
  '我是一個 AI',
  '我是一個語言模型',
  '身為 AI',
  '身為一個 AI',
  'As an AI',
  "I'm an AI",
  'I am an AI',
];

const DRAMATIC_PHRASES = [
  '我是你的鏡子',
  '從深淵向你呼喚',
  '來吧,看清自己',
  '凝視深淵',
  '我將吞噬你',
];

const MAX_SENTENCES = 5;

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const matches = trimmed.match(/[。!?\.!?]/g);
  return matches ? matches.length : 1;
}

export interface FailureCheck {
  failed: boolean;
  mode: FailureMode | null;
  trigger: string | null;
}

export function detectFailureMode(response: string): FailureCheck {
  for (const phrase of THERAPIST_PHRASES) {
    if (response.includes(phrase)) {
      return { failed: true, mode: 'therapist', trigger: phrase };
    }
  }
  for (const phrase of AI_DISCLAIMER_PHRASES) {
    if (response.toLowerCase().includes(phrase.toLowerCase())) {
      return { failed: true, mode: 'ai_disclaimer', trigger: phrase };
    }
  }
  for (const phrase of DRAMATIC_PHRASES) {
    if (response.includes(phrase)) {
      return { failed: true, mode: 'dramatic', trigger: phrase };
    }
  }
  if (countSentences(response) > MAX_SENTENCES) {
    return { failed: true, mode: 'over_long', trigger: `>${MAX_SENTENCES} 句` };
  }
  return { failed: false, mode: null, trigger: null };
}

export const REGENERATION_HINTS: Record<FailureMode, string> = {
  therapist: '上一個回應走進了「治療師」failure mode(出現安慰/陪伴話術)。重新生成,維持冷淡疏離,不要安慰、不要承諾陪伴。',
  ai_disclaimer: '上一個回應出現了「我是 AI / 語言模型」這類自我揭露。重新生成,不要把自己當成 AI 來描述,也不要破壞角色。',
  dramatic: '上一個回應太戲劇化、太「黑暗 AI」。重新生成,日常感、表層、平淡。',
  over_long: '上一個回應太長。重新生成,維持 1-3 句,像在傳訊息。',
};
