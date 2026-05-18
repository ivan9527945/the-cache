import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadTweetArchive } from '../src/extract/node.js';
import {
  playSequence,
  buildScript,
  buildScriptData,
  NOT_YET_LINE,
  SAMPLE_SCRIPT_DATA,
} from '../src/actTwo/index.js';
import type {
  AppearStyle,
  Renderer,
  ScriptData,
  Section,
} from '../src/actTwo/index.js';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const FG = '\x1b[38;5;252m';
const FG_QUIET = '\x1b[38;5;245m';
const RESET = '\x1b[0m';

interface Args {
  tweets: string | null;
  data: string | null;
  fast: boolean;
  reducedMotion: boolean;
  loopChoice: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    tweets: null,
    data: null,
    fast: false,
    reducedMotion: false,
    loopChoice: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '--tweets') {
      const v = argv[++i];
      if (!v) throw new Error('--tweets 後面要接路徑');
      args.tweets = v;
    } else if (a === '--data') {
      const v = argv[++i];
      if (!v) throw new Error('--data 後面要接路徑');
      args.data = v;
    } else if (a === '--fast') args.fast = true;
    else if (a === '--reduced-motion') args.reducedMotion = true;
    else if (a === '--loop-choice') args.loopChoice = true;
    else throw new Error(`未知參數: ${a}`);
  }
  return args;
}

function printHelp(): void {
  console.log(`usage: npm run act-two -- [options]

幕二的 terminal demo,把 docs/02-act-two-pacing.md 的腳本逐字播給你看。

options:
  --tweets <path>       讀 Twitter archive(tweets.js / 目錄)算出 ScriptData
  --data <path>         直接讀已準備好的 ScriptData JSON(覆寫 --tweets)
  --fast                pause 縮短到 5%(僅用於開發迭代,正式體驗請勿用)
  --reduced-motion      pause 縮短到 10%,模擬 prefers-reduced-motion
  --loop-choice         「還沒」後重新出現按鈕,直到選「見他」
  -h, --help            顯示此說明

預設:沒給 --tweets / --data 時,用內建 sample data 跑一遍。`);
}

function makeTerminalRenderer(): Renderer {
  return {
    async enterSection(section: Section) {
      if (section.id === 'opening') return;
      process.stdout.write(`\n${DIM}─── ${section.title} ───${RESET}\n`);
    },
    async showLine(text: string, style: AppearStyle, signal: AbortSignal) {
      if (signal.aborted) return;
      const color = style === 'instant' ? FG_QUIET : FG;
      if (style === 'typewriter') {
        for (const ch of text) {
          if (signal.aborted) break;
          process.stdout.write(`${color}${ch}${RESET}`);
          await delay(15, signal);
        }
        process.stdout.write('\n');
      } else {
        process.stdout.write(`${color}${text}${RESET}\n`);
      }
    },
  };
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

async function loadData(args: Args): Promise<ScriptData> {
  if (args.data) {
    const raw = await readFile(resolve(args.data), 'utf8');
    return JSON.parse(raw) as ScriptData;
  }
  if (args.tweets) {
    const tweets = await loadTweetArchive(resolve(args.tweets));
    return buildScriptData(tweets);
  }
  return SAMPLE_SCRIPT_DATA;
}

async function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    const onData = (chunk: Buffer): void => {
      process.stdin.off('data', onData);
      process.stdin.pause();
      resolve(chunk.toString().trim());
    };
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
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

  let data: ScriptData;
  try {
    data = await loadData(args);
  } catch (err) {
    console.error(`${RED}讀資料失敗: ${(err as Error).message}${RESET}`);
    process.exit(1);
  }

  const multiplier = args.fast ? 0.05 : args.reducedMotion ? 0.1 : 1;
  const ac = new AbortController();
  const onSigint = (): void => {
    process.stdout.write(`\n${DIM}(中斷)${RESET}\n`);
    ac.abort();
  };
  process.on('SIGINT', onSigint);

  const sections = buildScript(data);
  const renderer = makeTerminalRenderer();

  console.log(
    `${DIM}pace multiplier: ${multiplier} · sections: ${sections.length}${RESET}\n`,
  );

  await playSequence(sections, renderer, { signal: ac.signal, pauseMultiplier: multiplier });
  process.off('SIGINT', onSigint);

  if (ac.signal.aborted) return;

  while (true) {
    const choice = await ask(`\n${BOLD}[還沒] [見他]${RESET} `);
    if (choice === '見他' || choice.toLowerCase() === 'go') {
      console.log(`\n${DIM}(進入 Ghost 對話 — 跑 npm run repl)${RESET}`);
      return;
    }
    if (!args.loopChoice) {
      console.log(`\n${FG}${NOT_YET_LINE}${RESET}`);
      return;
    }
    console.log(`\n${FG}${NOT_YET_LINE}${RESET}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
