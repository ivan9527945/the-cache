import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  Ghost,
  OPENING_LINE,
  STANDARD_QUESTIONS,
  CATEGORY_META,
  detectFailureMode,
  renderMarkdownReport,
  summarize,
} from '../src/ghost/index.js';
import type {
  QuestionResult,
  StandardQuestion,
  UserFeatures,
} from '../src/ghost/index.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const DEFAULT_MODEL = 'claude-opus-4-7';

interface Args {
  featuresPath: string;
  out: string | null;
  model: string;
  delayMs: number;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    featuresPath: 'fixtures/sample-features.json',
    out: null,
    model: DEFAULT_MODEL,
    delayMs: 0,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (a === '--out' || a === '-o') {
      const next = argv[++i];
      if (!next) throw new Error('--out 後面要接路徑');
      args.out = next;
    } else if (a === '--model') {
      const next = argv[++i];
      if (!next) throw new Error('--model 後面要接模型名');
      args.model = next;
    } else if (a === '--delay') {
      const next = argv[++i];
      if (!next) throw new Error('--delay 後面要接毫秒');
      const n = Number(next);
      if (!Number.isFinite(n) || n < 0) throw new Error(`--delay 不是合法數字: ${next}`);
      args.delayMs = n;
    } else if (a && !a.startsWith('-')) {
      args.featuresPath = a;
    } else {
      throw new Error(`未知參數: ${a}`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`usage: npm run test:standard -- [features.json] [options]

跑 docs/01-ghost-prompt.md Section 8 的 12 題標準測試。
每題以乾淨 history(只含開場白)單獨呼叫 Ghost.chat,
報告會自動帶上 failure mode 檢測結果與盲評欄位。

options:
  -o, --out <path>   把 markdown 報告寫到檔案
      --model <id>   覆寫模型(預設 ${DEFAULT_MODEL})
      --delay <ms>   每題之間 sleep,避免撞 rate limit(預設 0)
  -h, --help         顯示此說明`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runQuestion(
  ghost: Ghost,
  q: StandardQuestion,
): Promise<QuestionResult> {
  const history = [
    { role: 'assistant' as const, content: OPENING_LINE },
    { role: 'user' as const, content: q.prompt },
  ];
  const startedAt = Date.now();
  try {
    const reply = await ghost.chat(history);
    const failure = detectFailureMode(reply.text);
    return {
      question: q,
      reply: reply.text,
      regenerated: reply.regenerated,
      stop_reason: reply.stop_reason,
      failure,
      elapsed_ms: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      question: q,
      reply: '',
      regenerated: false,
      stop_reason: null,
      failure: { failed: false, mode: null, trigger: null },
      error: (err as Error).message,
      elapsed_ms: Date.now() - startedAt,
    };
  }
}

function printConsole(results: QuestionResult[]): void {
  let currentCategory: string | null = null;
  for (const r of results) {
    const cat = r.question.category;
    if (cat !== currentCategory) {
      const meta = CATEGORY_META[cat];
      console.log(`\n${BOLD}${CYAN}== ${meta.label}(${meta.subtitle})${RESET}`);
      console.log(`${DIM}${meta.scoring}${RESET}`);
      currentCategory = cat;
    }
    console.log();
    console.log(`${BOLD}[${r.question.id}] You:${RESET} ${r.question.prompt}`);
    if (r.error) {
      console.log(`${RED}  ERROR: ${r.error}${RESET}`);
      continue;
    }
    const regenTag = r.regenerated ? `${YELLOW} (regen)${RESET}` : '';
    console.log(`${BOLD}      Ghost:${RESET}${regenTag} ${r.reply || `${DIM}(空回應)${RESET}`}`);
    const tag = r.failure.failed
      ? `${RED}FAIL${RESET} (${YELLOW}${r.failure.mode}${RESET}, trigger: ${r.failure.trigger})`
      : `${GREEN}PASS${RESET}`;
    console.log(`      ${DIM}detect: ${tag} · stop: ${r.stop_reason ?? 'n/a'} · ${r.elapsed_ms}ms${RESET}`);
  }
}

async function main(): Promise<void> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${RED}${(err as Error).message}${RESET}\n`);
    printHelp();
    process.exit(2);
  }
  if (args.help) {
    printHelp();
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`${RED}缺少 ANTHROPIC_API_KEY 環境變數。${RESET}`);
    process.exit(1);
  }

  const featuresPath = resolve(args.featuresPath);
  let features: UserFeatures;
  try {
    features = JSON.parse(await readFile(featuresPath, 'utf8')) as UserFeatures;
  } catch (err) {
    console.error(`${RED}無法讀取 features (${featuresPath}): ${(err as Error).message}${RESET}`);
    process.exit(1);
  }

  const ghost = new Ghost({ features, model: args.model });
  const runAt = new Date().toISOString();

  console.log(`${DIM}features: ${featuresPath}${RESET}`);
  console.log(`${DIM}model:    ${args.model}${RESET}`);
  console.log(`${DIM}questions: ${STANDARD_QUESTIONS.length}${RESET}`);

  const results: QuestionResult[] = [];
  for (let i = 0; i < STANDARD_QUESTIONS.length; i++) {
    const q = STANDARD_QUESTIONS[i]!;
    process.stdout.write(`\n${DIM}[${i + 1}/${STANDARD_QUESTIONS.length}] ${q.id} ${q.prompt}${RESET}`);
    const r = await runQuestion(ghost, q);
    results.push(r);
    if (args.delayMs > 0 && i < STANDARD_QUESTIONS.length - 1) {
      await sleep(args.delayMs);
    }
  }
  console.log('\n');

  printConsole(results);

  const summary = summarize(results);
  console.log(`\n${BOLD}== Summary${RESET}`);
  console.log(
    `  ${GREEN}PASS${RESET} ${summary.passed}/${summary.total} · regen ${summary.regenerated} · errors ${summary.errors}`,
  );
  for (const [mode, n] of Object.entries(summary.failed_by_mode)) {
    console.log(`  ${RED}FAIL${RESET} ${mode}: ${n}`);
  }

  if (args.out) {
    const md = renderMarkdownReport(
      {
        featuresPath: args.featuresPath,
        model: args.model,
        runAt,
        opening: OPENING_LINE,
      },
      results,
    );
    const outPath = resolve(args.out);
    await writeFile(outPath, md, 'utf8');
    console.log(`\n${DIM}已寫入 markdown 報告: ${outPath}${RESET}`);
  } else {
    console.log(`\n${DIM}(沒給 --out,markdown 報告未匯出。Sample: --out reports/run.md)${RESET}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
