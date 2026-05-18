import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Ghost } from '../src/ghost/index.js';
import type { ChatMessage, UserFeatures } from '../src/ghost/index.js';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const RED = '\x1b[31m';

function usage(): never {
  console.error('usage: npm run repl -- <path-to-features.json>');
  console.error('       (省略路徑會用 fixtures/sample-features.json)');
  process.exit(2);
}

async function loadFeatures(path: string): Promise<UserFeatures> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as UserFeatures;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`${RED}缺少 ANTHROPIC_API_KEY 環境變數。${RESET}`);
    process.exit(1);
  }

  const arg = process.argv[2];
  if (arg === '-h' || arg === '--help') usage();
  const featuresPath = resolve(arg ?? 'fixtures/sample-features.json');

  let features: UserFeatures;
  try {
    features = await loadFeatures(featuresPath);
  } catch (err) {
    console.error(`${RED}無法讀取 features (${featuresPath}): ${(err as Error).message}${RESET}`);
    process.exit(1);
  }

  const ghost = new Ghost({ features });
  const history: ChatMessage[] = [];

  console.log(`${DIM}features: ${featuresPath}${RESET}`);
  console.log(`${DIM}指令: /reset 清空對話 · /save <path> 匯出 transcript · /quit 離開${RESET}\n`);
  console.log(`${BOLD}Ghost:${RESET} ${ghost.opening}\n`);
  history.push({ role: 'assistant', content: ghost.opening });

  const rl = createInterface({ input, output });

  while (true) {
    const line = (await rl.question(`${BOLD}You:${RESET} `)).trim();

    if (line.length === 0) continue;
    if (line === '/quit' || line === '/exit') break;
    if (line === '/reset') {
      history.length = 0;
      history.push({ role: 'assistant', content: ghost.opening });
      console.log(`${DIM}(對話已清空)${RESET}\n${BOLD}Ghost:${RESET} ${ghost.opening}\n`);
      continue;
    }
    if (line.startsWith('/save ')) {
      const target = line.slice('/save '.length).trim();
      await writeFile(target, JSON.stringify(history, null, 2), 'utf8');
      console.log(`${DIM}已寫入 ${target}${RESET}\n`);
      continue;
    }

    history.push({ role: 'user', content: line });

    try {
      const reply = await ghost.chat(history);
      history.push({ role: 'assistant', content: reply.text });
      const tag = reply.regenerated ? `${DIM} (regen)${RESET}` : '';
      console.log(`${BOLD}Ghost:${RESET}${tag} ${reply.text}\n`);
    } catch (err) {
      history.pop();
      console.error(`${RED}API 錯誤: ${(err as Error).message}${RESET}\n`);
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
