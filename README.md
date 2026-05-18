# Posthumous — 專案規格

> 一個關於「死後的你」的互動敘事體驗。
> 使用者上傳自己的數位足跡，AI 生成一個「死後版的你」，跟一個虛構家人對話。
> 結束後揭露:你的數位殘骸能還原出多扁平的你。

## 文件結構

這份規格分成四個核心文件 + 一個整合說明:

1. **[01-ghost-prompt.md](./01-ghost-prompt.md)** — Ghost 的 prompt 工程
   完整 system prompt、動態組裝邏輯、測試流程、失敗模式分析。
   這是專案最難的部分,建議花最多時間調。

2. **[02-act-two-pacing.md](./02-act-two-pacing.md)** — 幕二的文案與節奏
   完整文案腳本(含 pause 時間)、節奏曲線、三大原則、技術實作提示。

3. **[03-privacy-architecture.md](./03-privacy-architecture.md)** — 隱私架構
   五層防護、可實作代碼、LLM API 設定、可驗證的承諾框架。
   隱私不是 marketing,是論證有效性的基礎。

4. **[04-ending-restraint.md](./04-ending-restraint.md)** — 結尾的留白
   為什麼不要揭露頁、極簡結尾完整設計、留白的具體規則。

5. **[05-integration.md](./05-integration.md)** — 四元素如何協同
   整合說明:這四個元素不是獨立的,如何互相強化、哪個失敗會崩塌整個作品。

## 專案哲學(讀任何細節前先讀這個)

這個專案在說:「你的數位足跡能還原出一個扁平的你,而這很可怕。」

如果作品本身在偷收集資料、塞煽情總結、把答案餵給觀眾——**作品就變成它批判的對象**。

四個核心元素的共同特徵是 **「克制」**:
- Ghost 克制深刻(才能扁平)
- 文案克制評價(才能冷)
- 架構克制收集(才能可信)
- 結尾克制總結(才能留白)

Black Mirror 之所以是 Black Mirror,不是因為它戲劇化,是因為它克制。
你的專案要走這條路。

**這四件事是 CI 上的回歸阻擋線**,不是口號 ——
`tests/restraint.test.ts` 把 docs/05 的四種退化模式變成 21 條 assertion,
任何後續改動讓克制鬆動會直接讓測試變紅。

## 不要做的事(紅線)

- ❌ 接受真實**已故親人**的資料上傳(只接受使用者本人的)
- ❌ 做 deepfake 級擬真臉孔
- ❌ 沒有 zero-retention 條款就上線
- ❌ 任何形式的 analytics / tracking / logging
- ❌ 結尾塞 CTA、分享按鈕、延伸閱讀
- ❌ 用「Product Hunt」式的方式推廣——這不是產品

## 動手順序建議

1. 先讀 `05-integration.md`,理解四元素如何協同
2. 再讀 `01-ghost-prompt.md`,因為這是最難的
3. 用自己的 Twitter archive 跑一遍 Ghost prompt(不需要 UI,直接 API call)
4. 確認 prompt 平衡後,再讀 `03-privacy-architecture.md` 建基礎建設
5. 最後讀 `02-act-two-pacing.md` 和 `04-ending-restraint.md` 做 UI

如果 Ghost 的 sweet spot 抓不到,整個專案就不必做。
所以先驗證最難的部分,再做其他。

## 我們不做什麼(隱私架構,出自 docs/03)

完整論證見 [docs/03-privacy-architecture.md](./docs/03-privacy-architecture.md) 與 hosted 版本的 `/privacy`。

- ❌ 在任何伺服器儲存使用者資料(沒有 DB、Redis、檔案儲存)
- ❌ Cookie(零個,不只是「必要 cookie」)
- ❌ GA / Plausible / Vercel Analytics 等流量分析
- ❌ Request log(access log 跟 application log 都不寫)
- ❌ 用使用者資料訓練任何模型

可驗證的點:

- `src/extract/tweetArchiveBrowser.ts` — 原始檔在瀏覽器解
- `web/app/api/chat/route.ts` — 後端只是 LLM 代理,不記 body
- `web/lib/useAutoCleanup.ts` — idle 5 分鐘 + beforeunload 全清
- `web/next.config.mjs` — production 嚴格 CSP

ZDR(Zero Data Retention)是流程,不是程式:正式上線前必須拿到 Anthropic
書面 ZDR addendum,連結放到 `/privacy`。預設個人 API key Anthropic 會
保留 30 天做安全監控,與隱私承諾衝突。

## 跑起來

```bash
# Ghost 核心 / CLI 工具(根目錄)
npm install
npm run dry-run                                     # 預覽組好的 prompt
npm run repl                                        # 互動測試
npm run test:standard -- --out reports/run-1.md     # 12 題標準測試
npm run extract -- data/tweets.js --out my.json     # archive → features
npm run act-two -- --fast                           # 幕二 terminal 版

# 前端(web/)
cd web && npm install && npm run dev                # http://localhost:3000
# 跑 /api/chat 需要設 ANTHROPIC_API_KEY
```
