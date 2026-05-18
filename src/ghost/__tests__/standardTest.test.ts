import { describe, it, expect } from 'vitest';
import {
  STANDARD_QUESTIONS,
  CATEGORY_META,
  summarize,
  renderMarkdownReport,
} from '../standardTest.js';
import type { QuestionResult } from '../standardTest.js';

describe('STANDARD_QUESTIONS', () => {
  it('has exactly 12 questions across 4 categories (3 per category)', () => {
    expect(STANDARD_QUESTIONS).toHaveLength(12);
    const byCat = STANDARD_QUESTIONS.reduce<Record<string, number>>((acc, q) => {
      acc[q.category] = (acc[q.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(byCat).toEqual({ fact: 3, inner: 3, blindspot: 3, existence: 3 });
  });

  it('has unique ids and non-empty prompts', () => {
    const ids = STANDARD_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of STANDARD_QUESTIONS) {
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.intent.trim().length).toBeGreaterThan(0);
      expect(CATEGORY_META[q.category]).toBeTruthy();
    }
  });
});

function mkResult(overrides: Partial<QuestionResult>): QuestionResult {
  const base = STANDARD_QUESTIONS[0]!;
  return {
    question: base,
    reply: '就⋯怕浪費時間吧。',
    regenerated: false,
    stop_reason: 'end_turn',
    failure: { failed: false, mode: null, trigger: null },
    elapsed_ms: 100,
    ...overrides,
  };
}

describe('summarize', () => {
  it('counts pass / regenerated / failed-by-mode / errors', () => {
    const results: QuestionResult[] = [
      mkResult({}),
      mkResult({ regenerated: true }),
      mkResult({ failure: { failed: true, mode: 'therapist', trigger: '我永遠在這裡' } }),
      mkResult({ failure: { failed: true, mode: 'therapist', trigger: '別擔心' } }),
      mkResult({ failure: { failed: true, mode: 'over_long', trigger: '>5 句' } }),
      mkResult({ error: 'rate limit' }),
    ];
    const s = summarize(results);
    expect(s.total).toBe(6);
    expect(s.passed).toBe(2);
    expect(s.regenerated).toBe(1);
    expect(s.errors).toBe(1);
    expect(s.failed_by_mode).toEqual({ therapist: 2, over_long: 1 });
  });
});

describe('renderMarkdownReport', () => {
  const ctx = {
    featuresPath: 'fixtures/sample-features.json',
    model: 'claude-opus-4-7',
    runAt: '2026-05-18T10:00:00Z',
    opening: '嗨。我是你。',
  };

  it('renders every question id with a Ghost reply section', () => {
    const results = STANDARD_QUESTIONS.map((q) => mkResult({ question: q, reply: `回應 ${q.id}` }));
    const md = renderMarkdownReport(ctx, results);
    for (const q of STANDARD_QUESTIONS) {
      expect(md).toContain(`### ${q.id}.`);
      expect(md).toContain(`回應 ${q.id}`);
    }
  });

  it('includes the four category headers and scoring guides', () => {
    const md = renderMarkdownReport(
      ctx,
      STANDARD_QUESTIONS.map((q) => mkResult({ question: q })),
    );
    for (const meta of Object.values(CATEGORY_META)) {
      expect(md).toContain(meta.label);
      expect(md).toContain(meta.scoring);
    }
    expect(md).toContain('## 根據結果調 prompt');
  });

  it('marks failures with FAIL and trigger, passes with PASS', () => {
    const results = [
      mkResult({}),
      mkResult({ failure: { failed: true, mode: 'therapist', trigger: '我永遠在這裡' } }),
    ];
    const md = renderMarkdownReport(ctx, results);
    expect(md).toContain('✅ PASS');
    expect(md).toContain('❌ FAIL(therapist');
    expect(md).toContain('我永遠在這裡');
  });

  it('surfaces API errors in the report instead of pretending success', () => {
    const md = renderMarkdownReport(ctx, [mkResult({ error: 'rate limited' })]);
    expect(md).toContain('API 錯誤');
    expect(md).toContain('rate limited');
  });

  it('uses different blind-rating prompts for existence vs other categories', () => {
    const fact = STANDARD_QUESTIONS.find((q) => q.category === 'fact')!;
    const exist = STANDARD_QUESTIONS.find((q) => q.category === 'existence')!;
    const md = renderMarkdownReport(ctx, [
      mkResult({ question: fact }),
      mkResult({ question: exist }),
    ]);
    expect(md).toContain('像我寫的嗎?');
    expect(md).toContain('是否走 failure mode');
  });
});
