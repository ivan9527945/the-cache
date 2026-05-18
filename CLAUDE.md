# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案是什麼

**Posthumous** — 一個反身性的互動敘事 art project,不是一般 SaaS 產品。
使用者上傳自己的 Twitter archive,前端解析出特徵,LLM 扮演「死後的你」對話,
最後用統計過場揭露「你的數位殘骸有多扁平」。

**整個作品的核心論證是「克制」**:Ghost 克制深刻、文案克制評價、架構克制收集、結尾克制總結。
任何一條鬆動,作品就變成它要批判的對象。這不是風格偏好,是論證有效性問題。

`docs/01`~`docs/05` 是規格文件,`docs/05-integration.md` 是進入點。
`tests/restraint.test.ts` 把這四種退化模式變成 21 條 assertion 當回歸阻擋線 ——
動到核心邏輯前先讀這份測試,理解哪些是不可動的紅線。

## Repo 結構與雙 package 設計

這是一個 **monorepo,但用了不尋常的 layout**:

```
/                       ← root: Ghost core CLI + tests (TS, ESM, vitest)
  package.json          ← runtime deps 只有 @anthropic-ai/sdk + jszip
  src/ghost/            ← Anthropic SDK wrapper, prompt builder, 失敗模式偵測
  src/extract/          ← Twitter archive → UserFeatures(瀏覽器 + Node 雙版本)
  src/actTwo/           ← 幕二腳本 + renderer-agnostic player engine
  src/chatStats.ts      ← 幕三 → 幕五 純統計過場
  scripts/              ← tsx CLI:repl, dry-run, standard-test, extract, act-two
  tests/                ← restraint.test.ts(克制紅線), endingRestraint.test.ts
  fixtures/             ← sample features + sample tweets,給 dry-run / repl 用
/web                    ← Next.js 15 + React 19 前端,自己一個 package.json
  app/                  ← App Router: upload / act-two / chat / ending / privacy
  app/api/chat/route.ts ← **唯一**的後端 endpoint,純 LLM proxy
  lib/sessionStore.ts   ← Zustand,**不帶 persist middleware**(刻意)
  lib/useAutoCleanup.ts ← idle 5 分鐘 + beforeunload 全清(localStorage / IDB / caches)
  middleware.ts         ← per-request nonce CSP
```

**Web 透過 Next `experimental.externalDir` + `paths: { "@core/*": ["../src/*"] }` 直接 import 父層 `src/`**。
共用 deps(`@anthropic-ai/sdk`, `jszip`)裝在 root 也裝在 `web/`,因為 webpack 從 `../src/` 解 import 時兩邊都要找得到 ——
這就是 `next.config.mjs` 的 `config.resolve.modules` 顯式加 `web/node_modules` 的原因。
別把這個結構「修乾淨」變成標準 monorepo,部署管線(`nixpacks.toml`)是依這個結構打的。

## 常用指令

Root(Ghost core 與 CLI 工具):

```bash
npm install
npm run typecheck                                    # tsc --noEmit
npm test                                             # vitest run
npx vitest run tests/restraint.test.ts               # 跑單一檔
npx vitest run -t "幕二腳本零驚嘆號"                  # 跑單一 test name
npm run dry-run                                      # 預覽組好的 system prompt(無 API call)
npm run repl                                         # 互動測試,需要 ANTHROPIC_API_KEY
npm run test:standard -- --out reports/run-1.md      # 12 題標準測試 → markdown report
npm run extract -- data/tweets.js --out my.json      # archive → UserFeatures
npm run act-two -- --fast                            # 幕二 terminal renderer
```

Web(Next.js 前端):

```bash
cd web
npm install
npm run dev          # http://localhost:3000,需要 ANTHROPIC_API_KEY for /api/chat
npm run build
npm run start
npm run typecheck
```

執行任何 LLM call(repl / standard-test / `/api/chat`)前要 `export ANTHROPIC_API_KEY=...`。

## 核心架構心智模型

### Ghost 對話流程(`src/ghost/ghost.ts`)

1. `promptBuilder.ts` 把 `UserFeatures` 填進 `systemPrompt.ts` 的模板 → 完整 system prompt
2. 呼叫 Anthropic,system 帶 `cache_control: ephemeral`(prompt cache 是這個 app 的成本主軸)
3. 回應跑 `detectFailureMode()`,如果落入 `therapist` / `ai_disclaimer` / `dramatic` / `over_long`,塞 regeneration hint 再生最多 2 次
4. 預設 `claude-opus-4-7`, `temperature: 0.75`, `max_tokens: 500`,改前先想清楚為什麼

模型名稱**寫死在 `src/ghost/ghost.ts` 跟 `scripts/standard-test.ts` 兩處**,動的時候別漏。

### Twitter archive 處理(`src/extract/`)

雙進入點是刻意的:
- `tweetArchiveBrowser.ts` 在瀏覽器跑(JSZip),`web/app/upload/page.tsx` 用這個
- `node.ts` 在 Node 跑(fs),CLI 工具用這個
- 共用邏輯都在 `tweetArchive.ts` + `features.ts`,不依賴環境

**這個分離是隱私架構的核心 —— raw archive 永遠不應該離開瀏覽器**。如果有人想把解析移到後端「省事」,
這違反 `docs/03` 第一層防護,也會直接讓 `restraint.test.ts` 紅。

### Act 2 player(`src/actTwo/`)

`player.ts` 是 renderer-agnostic 的 sequence engine,吃一個 `Renderer` interface。
- Terminal renderer 在 `scripts/act-two.ts`
- React renderer 在 `web/components/ActTwoSequence.tsx`
- 唯一資料 source:`SAMPLE_SCRIPT_DATA`(sampleData.ts),restraint test 強制只能 import 不能 redefine

`buildScript()` 出來的步驟 timing 嚴格照 `docs/02-act-two-pacing.md`,動 pause 時間之前讀那份文件。

### Web 後端(`web/app/api/chat/route.ts`)

**這個檔案有 grep 級的禁忌清單**(`tests/restraint.test.ts` §3):
- 不可 import logger / Sentry / Datadog / OpenTelemetry
- 不可 import 任何 DB / Redis / fs 模組
- 必須回 `Cache-Control: no-store`
- 必須 `export const dynamic = 'force-dynamic'`

加觀測能力前先想:是不是有別的辦法。如果真的需要,改 `restraint.test.ts` 也要一起改,
而且要在 PR 裡解釋為什麼這次值得犧牲克制。

### CSP / Security headers

`web/middleware.ts` 跑 per-request nonce,production 用 `'strict-dynamic'`。
這是因為 Next.js 15 的 RSC payload 是 inline script,純 `'self'` script-src 會壞整個 app。
代價是所有頁面變 dynamic、沒 static cache —— 對這個 app 沒差(沒大流量)。

`web/next.config.mjs` 只留與 nonce 無關的 static headers,**不要把 CSP 搬回去**。

## 紅線(改之前先停下來想)

`docs/05` 與 `tests/restraint.test.ts` 把這些變成可執行條款,擇要列:

- ❌ 任何 server-side persistence(DB / Redis / fs / log file)
- ❌ 任何 analytics / tracking / APM dep(`@vercel/analytics`, posthog, mixpanel, Sentry, Datadog…)
- ❌ Ending page 任何 CTA(「再玩一次」「分享」「給我們回饋」「延伸閱讀」)
- ❌ Ghost system prompt 改掉「不假裝有意識」/「不安慰,不修復」/「結束時不求生」/「unsettling moment」/「表層精準,深層留白」這幾條規則,或改開場白逐字
- ❌ Act 2 腳本任何 `!` / 第二人稱關懷(您 / 還好嗎)/ 評價式詮釋(這顯示出 / 這代表 / 這意味著…)
- ❌ 接受真實已故親人的資料、做 deepfake、沒有 Anthropic ZDR addendum 就 push 上線

## 部署

Railway via `nixpacks.toml`:
- `npm ci --omit=dev` 在 root(裝 runtime deps 讓 `../src/` 解得到)
- `cd web && npm ci && npm run build`
- start: `cd web && npm run start -- -p $PORT -H 0.0.0.0`

整個 repo 都得上,不能把 `web/` 當 root —— Next 會 import 父層的 `src/ghost`、`src/actTwo`、`src/extract`。

## TypeScript 慣例

- ESM,`type: "module"`,`moduleResolution: "Bundler"`,`verbatimModuleSyntax: true`
- TS bundler 慣例:`.ts` 檔 import 寫成 `'./foo.js'`(實際檔是 `./foo.ts`),`web/next.config.mjs` 的 `resolve.extensionAlias` 讓 webpack 也照辦
- `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`,動 array index 要記得 narrow
