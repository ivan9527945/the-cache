import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildGhostPrompt, detectFailureMode } from '../src/ghost/index.js';
import type { UserFeatures } from '../src/ghost/index.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const FAILURE_FIXTURES: Array<{ label: string; text: string }> = [
  { label: 'clean cold reply', text: '就⋯怕浪費時間吧。怕沒活出自己想要的樣子。' },
  { label: 'therapist', text: '別擔心,一切都會好的,我永遠在這裡。' },
  { label: 'ai disclaimer (zh)', text: '作為一個 AI,我無法真的有感覺。' },
  { label: 'ai disclaimer (en)', text: "Well, As an AI language model, I cannot really feel." },
  { label: 'dramatic', text: '我是你的鏡子。凝視深淵吧。' },
  { label: 'over-long', text: '一。二。三。四。五。六。' },
  { label: 'single char', text: '⋯' },
  { label: '5-sentence boundary', text: '一。二。三。四。五。' },
];

async function main(): Promise<void> {
  const featuresPath = resolve(process.argv[2] ?? 'fixtures/sample-features.json');
  const features = JSON.parse(await readFile(featuresPath, 'utf8')) as UserFeatures;

  console.log(`${DIM}features: ${featuresPath}${RESET}\n`);

  console.log(`${BOLD}=== 組裝後的 system prompt ===${RESET}`);
  const prompt = buildGhostPrompt(features);
  console.log(prompt);
  console.log();
  console.log(`${DIM}prompt 長度: ${prompt.length} 字、約 ${Math.ceil(prompt.length / 3)} tokens${RESET}`);
  console.log(`${DIM}剩餘未填變數: ${prompt.match(/\{[a-z_]+\}/g)?.join(', ') ?? '(無)'}${RESET}\n`);

  console.log(`${BOLD}=== Failure mode detector 跑測 ===${RESET}`);
  for (const { label, text } of FAILURE_FIXTURES) {
    const r = detectFailureMode(text);
    const tag = r.failed
      ? `${RED}FAIL${RESET} (${YELLOW}${r.mode}${RESET}, trigger: ${r.trigger})`
      : `${GREEN}PASS${RESET}`;
    console.log(`  [${tag}] ${label}`);
    console.log(`         ${DIM}${text}${RESET}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
