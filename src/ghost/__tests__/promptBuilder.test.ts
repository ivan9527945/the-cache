import { describe, it, expect } from 'vitest';
import { buildGhostPrompt } from '../promptBuilder.js';
import type { UserFeatures } from '../types.js';

const baseFeatures: UserFeatures = {
  linguistic: {
    avg_sentence_length: 18,
    punctuation_pattern: '少標點、常用句號',
    top_15_words: ['對', '其實', '感覺', '應該', '可能', '有點', '滿', '蠻', '吧', '欸', '齁', '啊', '就', '然後', '所以'],
    signature_phrases: ['不會吧', '就那樣', '幹真的'],
    paragraph_style: '單段、不換行',
    tone: '冷淡、自嘲、偶爾刻薄',
  },
  emoji: {
    frequency_per_message: 12,
    top_5: ['🙃', '😅', '🥲', '🫠', '💀'],
  },
  entities: {
    top_people: ['媽', '阿傑', '小宇', '老闆', 'M', '路人甲', '路人乙'],
    top_places: ['公司', '家', '師大', '陽明山'],
  },
  opinions: {
    stated_stances: ['討厭加班文化', '覺得 AI 被高估', '支持貓奴'],
  },
  interests: ['獨立電影', '咖啡', '長跑'],
  temporal: {
    active_hours: '22:00–02:00',
    peak_periods: ['週日深夜'],
  },
  sentiment: {
    emotion_breakdown: { 平靜: 40, 焦慮: 30, 自嘲: 20, 憤怒: 10 },
    overall_tone: '低能量、自嘲',
  },
};

describe('buildGhostPrompt', () => {
  it('fills every {token} so no placeholder leaks into output', () => {
    const prompt = buildGhostPrompt(baseFeatures);
    expect(prompt).not.toMatch(/\{[a-z_]+\}/);
  });

  it('inserts statistical features into expected sections', () => {
    const prompt = buildGhostPrompt(baseFeatures);
    expect(prompt).toContain('平均句長:18 字');
    expect(prompt).toContain('emoji 頻率:每 12 則訊息一個');
    expect(prompt).toContain('🙃 😅 🥲 🫠 💀');
    expect(prompt).toContain('冷淡、自嘲、偶爾刻薄');
    expect(prompt).toContain('22:00–02:00');
  });

  it('caps top_people at 5 even when more are supplied', () => {
    const prompt = buildGhostPrompt(baseFeatures);
    expect(prompt).toContain('媽、阿傑、小宇、老闆、M');
    expect(prompt).not.toContain('路人甲');
    expect(prompt).not.toContain('路人乙');
  });

  it('renders emotion_breakdown as human-readable percentages, sorted desc', () => {
    const prompt = buildGhostPrompt(baseFeatures);
    expect(prompt).toContain('平靜 40%、焦慮 30%、自嘲 20%、憤怒 10%');
  });

  it('handles empty emotion_breakdown without breaking', () => {
    const prompt = buildGhostPrompt({
      ...baseFeatures,
      sentiment: { emotion_breakdown: {}, overall_tone: '無' },
    });
    expect(prompt).toContain('情緒分布:(無資料)');
  });

  it('handles all-zero emotion_breakdown without divide-by-zero', () => {
    const prompt = buildGhostPrompt({
      ...baseFeatures,
      sentiment: { emotion_breakdown: { 平靜: 0, 焦慮: 0 }, overall_tone: '無' },
    });
    expect(prompt).toContain('情緒分布:(無資料)');
  });

  it('keeps the locked opening line in the prompt', () => {
    const prompt = buildGhostPrompt(baseFeatures);
    expect(prompt).toContain('嗨。我是你。或者,我是你留下的那部分。你想知道什麼?');
  });
});
