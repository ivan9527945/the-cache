// docs/05-integration.md 的可執行版本。
//
// 那份文件本身不是 feature spec,是「四元素互相強化,任一退化整個崩塌」的論證。
// 這支測試把每個退化模式變成 grep-able assertion,當回歸阻擋線:
//
//   元素一 Ghost 太深刻 / 太空洞   → §2 失敗模式 A/B
//   元素二 文案太煽情 / 太說教      → §2 失敗模式
//   元素三 隱private 是表演         → §2 失敗模式
//   元素四 結尾塞太多                → §2 失敗模式(已由 endingRestraint.test.ts 守住)
//
// 任何後續改動讓這些 assertion 變紅 —— 都要先停下來想:這值不值得犧牲克制。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYSTEM_PROMPT_TEMPLATE } from '../src/ghost/systemPrompt.js';
import { buildScript } from '../src/actTwo/script.js';
import { SAMPLE_SCRIPT_DATA } from '../src/actTwo/sampleData.js';

const ROOT = process.cwd();

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function load(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function loadCode(rel: string): string {
  return stripComments(load(rel));
}

describe('元素一 · Ghost 克制深刻(docs/05 §3 · docs/01 §2)', () => {
  it('system prompt 含「不假裝有意識」規則', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('不假裝有意識');
  });

  it('system prompt 含「不安慰,不修復」規則', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('不安慰,不修復');
  });

  it('system prompt 含「結束時不求生」規則', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('結束時不求生');
  });

  it('system prompt 含「中段一次 unsettling moment」規則', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('unsettling moment');
  });

  it('system prompt 含「表層精準,深層留白」規則', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('表層精準,深層留白');
  });

  it('開場白逐字鎖死,不可被改', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain(
      '嗨。我是你。或者,我是你留下的那部分。你想知道什麼?',
    );
  });
});

describe('元素二 · 文案克制評價(docs/05 §3 · docs/02 §1)', () => {
  const script = buildScript(SAMPLE_SCRIPT_DATA);
  const allText = script
    .flatMap((s) => s.steps.flatMap((step) => (step.kind === 'line' ? [step.text] : step.items)))
    .join('\n');

  it('幕二腳本零驚嘆號(冷感的最後底線)', () => {
    expect(allText).not.toMatch(/[!!]/);
  });

  it('幕二腳本保留「我們不知道」 — 系統不假裝全知', () => {
    expect(allText).toContain('我們不知道');
  });

  it('幕二腳本保留「也可能不是」 — 對自己詮釋的雙重免責', () => {
    expect(allText).toContain('也可能不是');
  });

  it('幕二腳本不出現評價式詮釋', () => {
    const interpretive = ['這顯示出', '這代表', '這表示', '這透露', '這意味著', '這證明'];
    for (const phrase of interpretive) {
      expect(allText).not.toContain(phrase);
    }
  });

  it('幕二腳本不出現第二人稱關懷(您 / 還好嗎)', () => {
    expect(allText).not.toContain('您');
    expect(allText).not.toContain('還好嗎');
  });
});

describe('元素三 · 架構克制收集(docs/05 §3 · docs/03)', () => {
  const apiRoute = loadCode('web/app/api/chat/route.ts');

  it('API route 回 Cache-Control: no-store', () => {
    expect(apiRoute).toMatch(/no-store/);
  });

  it('API route 設 force-dynamic,Next 不會 cache 任何 request', () => {
    expect(apiRoute).toMatch(/force-dynamic/);
  });

  it('API route 沒接 logger / observability / APM', () => {
    const forbidden = [
      /from\s+['"]winston['"]/,
      /from\s+['"]pino['"]/,
      /from\s+['"]bunyan['"]/,
      /from\s+['"]@sentry\//,
      /from\s+['"]@datadog\//,
      /from\s+['"]@opentelemetry\//,
      /\bSentry\.(captureException|init)\b/,
      /\bDatadog\b/,
    ];
    for (const p of forbidden) expect(apiRoute).not.toMatch(p);
  });

  it('API route 沒寫任何持久層(DB / Redis / fs)', () => {
    const forbidden = [
      /from\s+['"]@prisma\//,
      /from\s+['"]pg['"]/,
      /from\s+['"]mysql\d?['"]/,
      /from\s+['"]ioredis['"]/,
      /from\s+['"]redis['"]/,
      /from\s+['"]node:fs/,
      /from\s+['"]fs\/promises['"]/,
    ];
    for (const p of forbidden) expect(apiRoute).not.toMatch(p);
  });

  it('web/package.json 沒裝 analytics / tracking / APM packages', () => {
    const pkg = JSON.parse(load('web/package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const banned = [
      '@vercel/analytics',
      '@vercel/speed-insights',
      'posthog-js',
      'mixpanel-browser',
      '@sentry/nextjs',
      '@sentry/react',
      'plausible-tracker',
      'gtag',
      '@datadog/browser-rum',
    ];
    for (const b of banned) {
      expect(allDeps, `web 不該依賴 ${b}`).not.toHaveProperty(b);
    }
  });

  it('next.config 設了嚴格 CSP 與 frame-ancestors none', () => {
    const cfg = loadCode('web/next.config.mjs');
    expect(cfg).toMatch(/Content-Security-Policy/);
    expect(cfg).toMatch(/frame-ancestors 'none'/);
    expect(cfg).toMatch(/poweredByHeader:\s*false/);
  });
});

describe('元素四 · 結尾克制總結(docs/05 §3 · docs/04)', () => {
  it('結尾頁的禁忌條款由 tests/endingRestraint.test.ts 守住', () => {
    const t = load('tests/endingRestraint.test.ts');
    expect(t).toContain('window.close');
    expect(t).toContain('FORBIDDEN_CTA');
  });

  it('首頁與隱私頁沒有任何 「分享」 / 「再玩一次」 / 「給我們回饋」 CTA', () => {
    const cta = ['再玩一次', '分享給', '推薦給', '給我們回饋', '延伸閱讀', '相關報導'];
    for (const page of ['web/app/page.tsx', 'web/app/privacy/page.tsx']) {
      const src = loadCode(page);
      for (const phrase of cta) {
        expect(src, `${page} 不該出現 「${phrase}」`).not.toContain(phrase);
      }
    }
  });
});

describe('協同 · 四元素串得起來(docs/05 §1)', () => {
  it('整條使用者路徑(upload → act-two → ending)的路由都存在', () => {
    expect(() => load('web/app/upload/page.tsx')).not.toThrow();
    expect(() => load('web/app/act-two/page.tsx')).not.toThrow();
    expect(() => load('web/app/ending/page.tsx')).not.toThrow();
    expect(() => load('web/app/api/chat/route.ts')).not.toThrow();
    expect(() => load('web/app/privacy/page.tsx')).not.toThrow();
  });

  it('SAMPLE_SCRIPT_DATA 只剩單一來源(其餘都從 src/actTwo 引)', () => {
    const usages = [
      loadCode('scripts/act-two.ts'),
      loadCode('web/app/act-two/ActTwoClient.tsx'),
    ];
    for (const src of usages) {
      // 不可直接定義 SAMPLE_SCRIPT_DATA(避免重複)
      expect(src).not.toMatch(/const\s+SAMPLE_SCRIPT_DATA\s*[:=]/);
      // 必須 import
      expect(src).toMatch(/SAMPLE_SCRIPT_DATA/);
    }
  });
});
