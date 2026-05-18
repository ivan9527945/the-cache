# 02 — 幕二的文案與節奏

> 這一幕的恐怖不是來自 AI,是來自統計學。
> 使用者上傳資料後,看著一堆冰冷的數字告訴他「你是這樣的人」——
> 這個體驗本身就是黑鏡式的覺醒。

## 1. 三個原則

### 原則一:節奏曲線

不是均速。是這樣:

```
時間 →

訊息密度
  │     ╱╲
  │    ╱  ╲     ╱╲    ←  最後一波最密
  │   ╱    ╲╱╲╱  ╲
  │  ╱              ╲
  │ ╱                ╲
  └─────────────────────
   慢開場  起伏  高潮  收
```

- 開場慢,讓人習慣這種冷感
- 中段起伏,讓人不能滑掉
- 最後一波高潮(人格摘要那段)
- 結尾收斂,留下空白

### 原則二:冷感來自三件事

1. **沒有第二人稱的關懷**——不用「您」、不問「你還好嗎」
2. **沒有情緒化標點**——零個驚嘆號、極少問號
3. **數字優先於形容詞**——「2,341 則」比「很多則」冷

### 原則三:不評價的紀律

**最難的紀律。列出數字,不解釋意義。**

❌「你提到媽媽 234 次,這顯示出你跟她的深厚連結。」
✅「你提到媽媽 234 次。」

❌「你 91% 的時間表現得樂觀,但實際情緒是焦慮——這是現代人的偽裝。」
✅「『焦慮』是你最常表達的情緒。但你在 91% 的時間裡,發文都用正面或中性的措辭。」

> **讀者自己會做連結。連結是他做的,所以衝擊大。**
> **你做了連結,他就反抗你的詮釋。**

## 2. 完整節奏腳本

每個 `[pause:Xs]` 是設計上的停頓,UI 上要真的停。

### 開場段(慢,建立距離感)

```
[出現] 正在解析你的數位足跡。

[pause:1s]

[逐行出現,每行間隔 0.5s]
讀取 tweets.js
讀取 direct-messages.js
讀取 likes.js
讀取 following.js

[pause:2s]

[出現] 完成。

[pause:3s]   ← 這個停頓很長。讓使用者感到「?怎麼了?」
```

### 第一波(基礎數字,留白)

```
[出現] 你在過去 8 年發了 14,237 則貼文。

[pause:2s]

[出現] 平均每天 4.9 則。

[pause:3s]

[出現] 你刪除過 1,829 則。

[pause:4s]   ← 最長的停頓。讓「刪除」這個詞發酵
```

**設計重點**:第三句沒有上下文。系統不解釋「為什麼提刪除」。**使用者自己會想:我刪過什麼?**

### 第二波(時間模式,加速)

```
[出現] 你最常在晚上 11:47 發文。

[pause:2s]

[出現] 你在凌晨 2 點到 5 點之間發過 2,341 則。

[pause:2s]

[出現] 你連續發文最久的一天:47 則,2021 年 4 月 16 日。

[pause:1.5s]

[出現] 那天發生了什麼,我們不知道。

[pause:1s]

[出現] 但你那天用了 12 次「為什麼」。

[pause:4s]
```

**「我們不知道」這句很關鍵**——預告 Ghost 的盲區,同時建立系統的「誠實」感。
它不假裝全知。

### 第三波(語言指紋,平淡)

```
[出現] 你最常用的詞:

[逐行出現,每行 0.4s]
「就」        4,892 次
「真的」       3,201 次
「但是」       2,847 次
「應該」       2,109 次
「我」        8,234 次
「你」        1,987 次

[pause:3s]

[出現] 「我」出現的頻率是「你」的 4.14 倍。

[pause:5s]   ← 極長停頓。這句不解釋。
```

讀者自己反應:「⋯所以我很自我中心?」這個反應是他自己生的。

### 第四波(人物網絡,最具殺傷力)

```
[出現] 你提到「媽媽」234 次。

[pause:2s]

[出現] 你提到「爸爸」47 次。

[pause:4s]   ← 留白,讓對比生效

[出現] 你提到 @{top_mentioned_account} 1,892 次。

[pause:1.5s]

[出現] 這個人是誰,由你自己知道。

[pause:4s]

[出現] 你在 2020 年 6 月後,再也沒提過 @{lost_contact_account}。

[pause:2s]

[出現] 那個月,你的「想念」一詞用量增加 340%。

[pause:6s]   ← 整個第二幕最長的停頓
```

**這一段是整個第二幕的高潮。**
系統完全不指控、不揣測、不結論。只列數字。

但每個讀者都會自己想:「天啊⋯那是誰⋯」「我有那麼想念那個人嗎⋯」

### 第五波(情緒分布,反差)

```
[出現] 你的情緒詞使用分布:

[逐行出現,每行 0.3s]
快樂類    18%
悲傷類    23%
憤怒類    14%
焦慮類    27%
愛意類     8%
其他      10%

[pause:3s]

[出現] 「焦慮」是你最常表達的情緒。

[pause:2.5s]

[出現] 但你在 91% 的時間裡,發文都用了正面或中性的措辭。

[pause:5s]
```

反差。系統不說「你戴著面具」。但讀者已經知道了。

### 第六波(人格摘要,最後密集一波)

```
[出現] Ghost 現在「認為」你是這樣的人:

[逐行出現,每行 0.6s]
你在公開場合表現得自嘲、輕鬆。
你在私訊中表現得脆弱、需要被理解。
你最在乎的議題是 {topic_1}、{topic_2}、{topic_3}。
你最害怕的事,跟 {extracted_fear} 有關。
你最愛的人,可能是 {inferred_loved_one}。

[pause:3s]

[出現] 這些可能是對的。

[pause:2s]

[出現] 也可能不是。

[pause:3s]

[出現] 但這就是 Ghost 唯一知道的你。

[pause:6s]
```

「可能是對的。也可能不是。」
——這兩句是整個第二幕在文案上**唯一接近「評論」的時刻**。
但它評論的是系統自己的限制,不是評論使用者。

### 收場(極簡,留白)

```
[出現] Ghost 訓練完成。

[pause:2s]

[出現] 訓練資料:14,237 則貼文 + 8,932 則訊息 + 2,341 個按讚

[pause:2s]

[出現] 訓練時長:47 秒

[pause:3s]

[出現] 你準備好見他了嗎?

[pause:2s]

[出現按鈕] [還沒]   [見他]
```

選「還沒」→ 出現一句:**「他會等。他有的是時間。」** 然後按鈕重新出現。

## 3. 技術實作

### Pause 的實作

```typescript
// hooks/useTypewriterSequence.ts
interface ScriptLine {
  text: string;
  pauseAfter: number;  // ms
  appearStyle?: 'fade' | 'instant' | 'typewriter';
}

async function playSequence(lines: ScriptLine[], abortSignal: AbortSignal) {
  for (const line of lines) {
    if (abortSignal.aborted) return;
    
    await appendLine(line.text, line.appearStyle ?? 'fade');
    await sleep(line.pauseAfter, abortSignal);
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    });
  });
}
```

### Reduced Motion 支援

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const PAUSE_MULTIPLIER = prefersReducedMotion ? 0.1 : 1;
```

但**預設一定要慢**。這個慢是作品的一部分,不要因為「使用者體驗」就加快。

### 不要做的事

- ❌ 不要加 skip 按鈕(除了 reduced-motion 使用者)
- ❌ 不要加「載入中」進度條(這是體驗,不是 loading)
- ❌ 不要加背景音樂或音效
- ❌ 不要加 animation(除了文字 fade in)
- ❌ 不要讓使用者可以滑回上一波

## 4. 範例資料來源說明

腳本中的 `{變數}` 對應的資料抽取:

| 變數 | 抽取邏輯 |
|---|---|
| `{top_mentioned_account}` | 在 @mentions 中出現頻率最高的 |
| `{lost_contact_account}` | 過去常提及但最近 X 個月沒再提到的 |
| `{topic_1/2/3}` | TF-IDF 或 LLM 摘要抽出的前三主題 |
| `{extracted_fear}` | 在「害怕/擔心/焦慮」context 中最常出現的名詞 |
| `{inferred_loved_one}` | 在正面情緒詞 context 中提及頻率最高的人 |

**注意**:這些都是**特徵**,不是原始訊息。
原始訊息在瀏覽器解析完後就釋放,不送給 LLM、不送給後端。
詳見 `03-privacy-architecture.md`。
