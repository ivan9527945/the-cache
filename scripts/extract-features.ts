import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadTweetArchive, buildFeaturesFromTweets } from '../src/extract/index.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

interface Args {
  input: string | null;
  out: string;
  tzOffset: number;
  noReplies: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: null,
    out: 'features.json',
    tzOffset: 8,
    noReplies: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '-o' || a === '--out') {
      const v = argv[++i];
      if (!v) throw new Error('--out 後面要接路徑');
      args.out = v;
    } else if (a === '--tz') {
      const v = argv[++i];
      if (!v) throw new Error('--tz 後面要接時區偏移(例如 +8)');
      const n = Number(v);
      if (!Number.isFinite(n) || n < -12 || n > 14) throw new Error(`--tz 不是合法數字: ${v}`);
      args.tzOffset = n;
    } else if (a === '--no-replies') {
      args.noReplies = true;
    } else if (a && !a.startsWith('-')) {
      args.input = a;
    } else {
      throw new Error(`未知參數: ${a}`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`usage: npm run extract -- <tweets.js | tweets-dir> [options]

從 Twitter 官方 archive 抽出 UserFeatures。

options:
  -o, --out <path>     輸出 features.json 路徑(預設 features.json)
      --tz <offset>    時間偏移小時數(預設 +8 = 台灣)
      --no-replies     排除回覆推文
  -h, --help           顯示此說明

input 可以是:
  • 單一檔案路徑(e.g. data/tweets.js)
  • Twitter archive data/ 目錄,會自動找所有 tweets*.js`);
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
  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 2);
  }

  const inputPath = resolve(args.input);
  console.log(`${DIM}reading: ${inputPath}${RESET}`);

  let tweets;
  try {
    tweets = await loadTweetArchive(inputPath);
  } catch (err) {
    console.error(`${RED}讀檔失敗: ${(err as Error).message}${RESET}`);
    process.exit(1);
  }

  console.log(`${DIM}parsed ${tweets.length} tweets${RESET}`);

  const { features, meta } = buildFeaturesFromTweets(tweets, {
    tzOffsetHours: args.tzOffset,
    includeReplies: !args.noReplies,
  });

  const outPath = resolve(args.out);
  await writeFile(outPath, JSON.stringify(features, null, 2) + '\n', 'utf8');

  console.log();
  console.log(`${BOLD}== 抽取結果${RESET}`);
  console.log(
    `  parsed ${meta.inputTweets} → used ${meta.usedTweets}(略過 retweet ${meta.ignoredRetweets} 則)`,
  );
  console.log(`  寫入: ${outPath}\n`);

  console.log(`${BOLD}${GREEN}✅ 已從資料算出(${meta.filledFields.length} 欄):${RESET}`);
  for (const path of meta.filledFields) {
    console.log(`   ${DIM}•${RESET} ${path} = ${formatValue(get(features, path))}`);
  }

  console.log(`\n${BOLD}${YELLOW}🟡 推測值(規則猜測,可手調):${RESET}`);
  for (const path of meta.inferredFields) {
    console.log(`   ${DIM}•${RESET} ${path} = ${formatValue(get(features, path))}`);
  }

  console.log(`\n${BOLD}${CYAN}⚠️  以下欄位留空,跑 Ghost 前建議手填:${RESET}`);
  for (const m of meta.manualFields) {
    console.log(`   ${DIM}•${RESET} ${m.path}`);
    console.log(`     ${DIM}→ ${m.hint}${RESET}`);
  }

  console.log(`\n${DIM}下一步:${RESET}`);
  console.log(`  1. 編輯 ${args.out} 補上手填欄位`);
  console.log(`  2. ${BOLD}npm run dry-run -- ${args.out}${RESET}  ${DIM}# 預覽 prompt${RESET}`);
  console.log(`  3. ${BOLD}npm run repl -- ${args.out}${RESET}     ${DIM}# 互動測試${RESET}`);
  console.log(`  4. ${BOLD}npm run test:standard -- ${args.out} --out reports/run-1.md${RESET}`);
}

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return `[${v.slice(0, 8).map(formatValue).join(', ')}${v.length > 8 ? ', …' : ''}]`;
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return v.toString();
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
