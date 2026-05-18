// 把 docs/04-ending-restraint.md §5/§6 的「不要做的事」變成 grep-able 約束。
// 這支不是行為測試,是「設計鐵則」測試 —— 任何人想動結尾頁
// 都會先看到這些 assertion 並理解為什麼。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function stripComments(src: string): string {
  // 註解可能會提到「我們刻意不做」的字串 —— 那些是文件,不是違規。
  // 只看可執行的程式碼。
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function load(rel: string): string {
  return stripComments(readFileSync(join(ROOT, rel), 'utf8'));
}

const ENDING_FINAL = load('web/app/ending/EndingFinal.tsx');
const ENDING_CLIENT = load('web/app/ending/EndingClient.tsx');
const ENDING_FILES = [ENDING_FINAL, ENDING_CLIENT];

const FORBIDDEN_REDIRECTS = [
  /router\.push\(/,
  /router\.replace\(/,
  /\buseRouter\b/,
  /\bredirect\(/,
  /window\.location\.href\s*=/,
];

const FORBIDDEN_ANALYTICS = [
  /\bgtag\b/i,
  /va\.track/,
  /mixpanel/i,
  /posthog/i,
  /plausible/i,
  /\bsegment\.io\b/i,
  /\banalytics\.(track|page|identify)\b/,
];

const FORBIDDEN_CTA = [
  /再玩一次/,
  /分享/,
  /推薦/,
  /給我們回饋/,
  /延伸閱讀/,
  /相關報導/,
];

const FORBIDDEN_AUDIO = [/<audio[\s>]/i, /new Audio\(/, /AudioContext/i, /\.play\(\)/];

describe('幕五 — 結尾的留白(docs/04 §5/§6)', () => {
  it('結尾畫面沒有自動跳轉(無 router push / redirect / location 改寫)', () => {
    for (const pattern of FORBIDDEN_REDIRECTS) {
      expect(ENDING_FINAL).not.toMatch(pattern);
    }
  });

  it('結尾畫面沒有自動 setTimeout 把使用者送走', () => {
    // 允許 timing(animationDelay)和 React effect,但禁止 setTimeout 改變 location 或 router
    const setTimeoutCalls = ENDING_FINAL.match(/setTimeout\([^)]*\)/g) ?? [];
    for (const call of setTimeoutCalls) {
      expect(call).not.toMatch(/location|router|redirect|close|navigate/);
    }
  });

  it('結尾兩支元件都沒有 analytics / tracking', () => {
    for (const src of ENDING_FILES) {
      for (const pattern of FORBIDDEN_ANALYTICS) {
        expect(src).not.toMatch(pattern);
      }
    }
  });

  it('結尾兩支元件都沒有 CTA 字串(分享 / 再玩一次 / 回饋 / 延伸閱讀)', () => {
    for (const src of ENDING_FILES) {
      for (const pattern of FORBIDDEN_CTA) {
        expect(src).not.toMatch(pattern);
      }
    }
  });

  it('結尾畫面沒有外部連結(無 https:// URL)', () => {
    expect(ENDING_FINAL).not.toMatch(/https?:\/\//);
  });

  it('結尾畫面沒有音樂 / 音效 / AudioContext', () => {
    for (const src of ENDING_FILES) {
      for (const pattern of FORBIDDEN_AUDIO) {
        expect(src).not.toMatch(pattern);
      }
    }
  });

  it('唯一的關閉動作是 window.close()', () => {
    expect(ENDING_FINAL).toMatch(/window\.close\(\)/);
  });

  it('Q2 textarea 是 uncontrolled — 不存使用者寫的東西', () => {
    expect(ENDING_CLIENT).toMatch(/ref=\{q2Ref\}/);
    expect(ENDING_CLIENT).toMatch(/defaultValue=""/);
    // 確認 onDelete 沒讀 textarea 值
    expect(ENDING_CLIENT).not.toMatch(/q2Ref\.current\?\.value/);
    expect(ENDING_CLIENT).not.toMatch(/q2Ref\.current\.value/);
  });

  it('刪除流程不寫進任何持久層 — 不偷藏使用者的勾選或文字', () => {
    for (const src of ENDING_FILES) {
      expect(src).not.toMatch(/localStorage\.setItem/);
      expect(src).not.toMatch(/sessionStorage\.setItem/);
      expect(src).not.toMatch(/fetch\(/);
      expect(src).not.toMatch(/XMLHttpRequest/);
      expect(src).not.toMatch(/navigator\.sendBeacon/);
    }
  });

  it('最後三句話照 doc 逐字實作', () => {
    expect(ENDING_FINAL).toContain('已刪除。');
    expect(ENDING_FINAL).toContain('你還活著。');
  });
});
