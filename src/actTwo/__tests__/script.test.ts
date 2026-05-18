import { describe, it, expect } from 'vitest';
import { buildScript } from '../script.js';
import type { ScriptData } from '../types.js';

const FULL_DATA: ScriptData = {
  archiveFiles: ['tweets.js', 'direct-messages.js'],
  totalPosts: 14237,
  yearsActive: 8,
  postsPerDay: 4.9,
  deletedCount: 1829,
  peakHourMinute: '23:47',
  lateNightCount: 2341,
  longestDayCount: 47,
  longestDayDate: '2021 年 4 月 16 日',
  longestDayWhyCount: 12,
  topWordsWithCounts: [
    { word: '就', count: 4892 },
    { word: '真的', count: 3201 },
    { word: '但是', count: 2847 },
    { word: '應該', count: 2109 },
    { word: '我', count: 8234 },
    { word: '你', count: 1987 },
  ],
  pronounSelfCount: 8234,
  pronounYouCount: 1987,
  pronounRatio: 4.14,
  motherCount: 234,
  fatherCount: 47,
  topMention: { account: 'A', count: 1892 },
  lostContact: {
    account: 'B',
    sinceYearMonth: '2020 年 6 月',
    missingTerm: '想念',
    missingTermSurgePct: 340,
  },
  emotionBreakdown: [
    { label: '快樂類', pct: 18 },
    { label: '焦慮類', pct: 27 },
  ],
  topEmotionLabel: '焦慮',
  positiveOrNeutralPct: 91,
  topics: ['工作', '社群', '家人'],
  extractedFear: '被遺忘',
  inferredLovedOne: 'M',
  trainingPostCount: 14237,
  trainingDmCount: 8932,
  trainingLikeCount: 2341,
  trainingDurationSeconds: 47,
};

function allLines(sections: ReturnType<typeof buildScript>): string[] {
  const out: string[] = [];
  for (const s of sections) {
    for (const step of s.steps) {
      if (step.kind === 'line') out.push(step.text);
      else out.push(...step.items);
    }
  }
  return out;
}

describe('buildScript', () => {
  it('emits all 8 sections in canonical order', () => {
    const ids = buildScript(FULL_DATA).map((s) => s.id);
    expect(ids).toEqual([
      'opening',
      'wave-1',
      'wave-2',
      'wave-3',
      'wave-4',
      'wave-5',
      'wave-6',
      'closing',
    ]);
  });

  it('substitutes numbers with thousands separators', () => {
    const text = allLines(buildScript(FULL_DATA)).join('\n');
    expect(text).toContain('14,237 則貼文');
    expect(text).toContain('1,829');
    expect(text).toContain('2,341');
  });

  it('renders the pivotal closing lines verbatim from the doc', () => {
    const text = allLines(buildScript(FULL_DATA)).join('\n');
    expect(text).toContain('這些可能是對的。');
    expect(text).toContain('也可能不是。');
    expect(text).toContain('但這就是 Ghost 唯一知道的你。');
    expect(text).toContain('你準備好見他了嗎?');
  });

  it('renders the "我們不知道" inflection line in wave 2', () => {
    const wave2 = buildScript(FULL_DATA).find((s) => s.id === 'wave-2')!;
    const texts = wave2.steps.flatMap((s) => (s.kind === 'line' ? [s.text] : s.items));
    expect(texts).toContain('那天發生了什麼,我們不知道。');
  });

  it('omits optional lines when their data is null', () => {
    const stripped = buildScript({
      ...FULL_DATA,
      deletedCount: null,
      longestDayWhyCount: null,
      motherCount: null,
      fatherCount: null,
      lostContact: null,
    });
    const text = allLines(stripped).join('\n');
    expect(text).not.toContain('你刪除過');
    expect(text).not.toContain('「為什麼」');
    expect(text).not.toContain('你提到「媽媽」');
    expect(text).not.toContain('你提到「爸爸」');
    expect(text).not.toContain('再也沒提過');
  });

  it('keeps the opening file reads in declared order', () => {
    const opening = buildScript(FULL_DATA)[0]!;
    const listStep = opening.steps.find((s) => s.kind === 'list')!;
    if (listStep.kind !== 'list') throw new Error('expected list step');
    expect(listStep.items).toEqual(['讀取 tweets.js', '讀取 direct-messages.js']);
  });

  it('total nominal runtime falls within the designed 60-120s window', () => {
    const sections = buildScript(FULL_DATA);
    let total = 0;
    for (const s of sections) {
      for (const step of s.steps) {
        total += step.pauseAfterMs;
        if (step.kind === 'list') total += step.perItemDelayMs * Math.max(0, step.items.length - 1);
      }
    }
    expect(total).toBeGreaterThan(60_000);
    expect(total).toBeLessThan(120_000);
  });
});
