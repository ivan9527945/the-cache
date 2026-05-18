# 03 — 隱私架構

> 一般 app 的隱私是「合規」問題。
> **這個 app 的隱私是「論證有效性」問題。**

## 1. 為什麼這個專案的隱私要求比一般高

你的整個作品在說:「看,你的數位足跡能還原出一個扁平的你,這很可怕。」

如果你自己這個 app 也在偷收集資料——**你就是你批判的那家公司**。
整個論證崩塌。

所以隱私不能是 marketing 文案,必須是 **可驗證的架構**。

## 2. 五層防護

```
[使用者瀏覽器]
    ↓
第一層:瀏覽器端解析(原始檔不上傳)
    ↓
[特徵摘要,純統計]
    ↓
第二層:無狀態後端(只當 LLM 代理)
    ↓
第三層:前端記憶體自動清除
    ↓
[LLM API]
    ↓
第四層:Zero Retention API 設定
    ↓
第五層:開源 + 可驗證
```

## 3. 第一層:瀏覽器端解析

**核心原則:盡量讓資料不離開瀏覽器**

```
原始 Twitter archive
    │
    ↓
[瀏覽器解析]  ← 在這裡完成 95% 的工作
    │
    ↓
特徵摘要(純統計,不含原文)
    │
    ↓
[送到後端]  ← 只送這個
    │
    ↓
[LLM API]
```

### 實作

```typescript
// utils/parser.ts
import JSZip from 'jszip';

export async function parseTwitterArchive(file: File): Promise<UserFeatures> {
  // 解壓 — 在瀏覽器內,原始檔從不上傳
  const zip = await JSZip.loadAsync(file);
  
  const tweetsRaw = await zip.file('data/tweets.js')!.async('text');
  const messagesRaw = await zip.file('data/direct-messages.js')!.async('text');
  
  // Twitter 用 JS 變數包裝,要先 strip
  const tweets = JSON.parse(
    tweetsRaw.replace(/^window\.YTD\.\w+\.part\d+ = /, '')
  );
  const messages = JSON.parse(
    messagesRaw.replace(/^window\.YTD\.\w+\.part\d+ = /, '')
  );
  
  // 抽特徵(在這裡,瀏覽器內)
  const features: UserFeatures = {
    linguistic: extractLinguisticFeatures(tweets, messages),
    temporal: extractTemporalPatterns(tweets, messages),
    entities: extractTopEntities(tweets, messages),
    sentiment: extractSentimentDistribution(tweets, messages),
    // ⚠️ features 裡完全沒有原始 tweet 文字
  };
  
  // 顯式釋放(GC 會處理,但顯式 null 表明意圖)
  return features;
}
```

### 特徵抽取的混合策略

| 任務 | 在哪 | 原因 |
|---|---|---|
| 字頻、時間、emoji 統計 | 瀏覽器純 JS | 純統計,不需要模型 |
| 情緒分析、實體抽取 | 瀏覽器 transformers.js | 用本地 model,完全不送出 |
| 主題摘要、人格摘要 | LLM(送匿名特徵) | 只送抽完的特徵,不送原文 |

## 4. 第二層:無狀態後端

```python
# main.py
from fastapi import FastAPI, Request
from anthropic import Anthropic
import os

app = FastAPI()

# ⚠️ 注意:沒有資料庫連線、沒有 Redis、沒有 file storage
# 這個 service 唯一的依賴是 Anthropic API

client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    
    # 直接轉發給 Anthropic,不做任何持久化
    response = client.messages.create(
        model="claude-opus-4-7",
        system=body["system_prompt"],
        messages=body["messages"],
        max_tokens=500,
    )
    
    return {"content": response.content[0].text}

# 沒有 @app.middleware
# 沒有 logging
# 沒有 sentry
# 沒有 datadog
# 沒有 access log
```

### Reverse Proxy 設定

如果用 Nginx / Caddy,access log 也要關掉:

```nginx
server {
    # ⚠️ 關閉 access log,避免記錄 request body
    access_log off;
    error_log /var/log/nginx/error.log error;  # 只記錯誤,不含 body
    
    location /chat {
        proxy_pass http://backend;
        # 不要 proxy_set_header 帶 user info
    }
}
```

## 5. 第三層:前端記憶體管理

```typescript
// stores/sessionStore.ts
// 使用 Zustand,但確保資料只在記憶體

import { create } from 'zustand';
// ⚠️ 注意:沒有 persist middleware

interface SessionState {
  features: UserFeatures | null;
  messages: Message[];
  setFeatures: (f: UserFeatures) => void;
  addMessage: (m: Message) => void;
  purge: () => void;
}

export const useSession = create<SessionState>((set) => ({
  features: null,
  messages: [],
  setFeatures: (f) => set({ features: f }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  purge: () => set({ features: null, messages: [] }),
}));
```

### 自動清除 hook

```typescript
// hooks/useAutoCleanup.ts
import { useEffect } from 'react';
import { useSession } from '@/stores/sessionStore';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 分鐘

export function useAutoCleanup() {
  const purge = useSession((s) => s.purge);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(purgeEverything, IDLE_TIMEOUT);
    }
    
    function purgeEverything() {
      // 清空 store
      purge();
      
      // 清空所有瀏覽器儲存
      localStorage.clear();
      sessionStorage.clear();
      
      if (typeof indexedDB !== 'undefined') {
        indexedDB.databases?.().then((dbs) => {
          dbs.forEach((db) => db.name && indexedDB.deleteDatabase(db.name));
        });
      }
      
      if ('caches' in window) {
        caches.keys().then((keys) => 
          keys.forEach((k) => caches.delete(k))
        );
      }
      
      // 強制重新導向到首頁
      window.location.href = '/';
    }
    
    // 監聽活動
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => document.addEventListener(e, resetTimer));
    
    // tab 關閉時也清
    window.addEventListener('beforeunload', purgeEverything);
    
    resetTimer();
    
    return () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, resetTimer));
      window.removeEventListener('beforeunload', purgeEverything);
    };
  }, [purge]);
}
```

## 6. 第四層:LLM API 設定

### Anthropic API:必須走 Zero Data Retention

```python
response = client.messages.create(
    model="claude-opus-4-7",
    system=system_prompt,
    messages=messages,
    max_tokens=500,
)
```

⚠️ **這部分必須真的去做**:

1. 註冊 Anthropic API **商業帳號**
2. 申請 **Zero Data Retention**
3. **拿到書面確認後**才能在隱私頁聲稱「LLM 不保留資料」

> 如果你只是個人 API key,**Anthropic 預設會保留 30 天**做安全監控。
> 這跟你的承諾衝突。你必須走商業 ZDR 流程。

申請方式:聯絡 Anthropic sales,要求 ZDR addendum。
參考:https://privacy.anthropic.com/

## 7. 第五層:開源 + 可驗證(最重要)

光是說「我們不收集」沒用——任何 app 都這樣說。
**讓人可以驗證才有用**。

### 必做事項

1. **公開 GitHub repo**
   - 完整 source code
   - 包含部署設定(Dockerfile / fly.toml / vercel.json)
   - 包含 CI/CD 設定

2. **部署透明**
   - 使用可審計的部署方式(Vercel / Fly.io 的 build log 公開)
   - 在 README 寫明部署 commit hash

3. **架構文件**
   - 一張清楚的資料流圖
   - 列出所有外部依賴
   - 列出所有**不使用**的東西(沒有 GA、沒有 Sentry⋯)

4. **本地版本**
   - Docker compose 一鍵啟動
   - 讓不信任 hosted 版本的人可以自己跑

### 範例 README 結構

```markdown
# Posthumous

This is not a service. This is an art project.

## What this does
[簡短描述]

## What this does NOT do
- ❌ Store your data on any server, ever
- ❌ Use cookies (zero, not "essential cookies only")
- ❌ Track you with analytics
- ❌ Log requests
- ❌ Train any model on your data

## How to verify this
1. This repo is the entire codebase. Read it.
2. The hosted version at [URL] is deployed from commit `abc123`.
3. You can run it locally: `docker compose up`
4. Network tab in DevTools will show every byte that leaves your browser.

## Architecture
[資料流圖]

## Dependencies
- Anthropic Claude API (with Zero Data Retention agreement: [link to ZDR proof])
- That's it.
```

## 8. 部署側額外注意

- ❌ **不要用** Vercel Analytics、Google Analytics、Plausible 等帶 fingerprint 的工具
- 如果一定要分析流量,用 **server log 級別的純 pageview 計數**,不關聯 session
- HTTPS-only
- CSP header 嚴格設定,禁止任何第三方 script

```typescript
// next.config.js (範例)
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'none'",
    ].join('; ')
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];
```

## 9. 誠實的限制聲明

**完美的隱私不存在**。

即便你做完上面五層,還是有風險:

- 使用者可能用公司網路,公司的 SSL 中間人能看到流量
- 使用者的瀏覽器可能有 extension 偷讀 DOM
- Anthropic 的 ZDR 也只是「不長期保留」,不是「完全不見」
- 你的伺服器主機商(Fly / Vercel)有實體存取權

**這個專案的承諾應該是「我們做了能做的一切」,不是「絕對安全」。**

誠實標明限制,反而比假裝完美有公信力。

放一個 `/privacy` 頁面,把上面這些限制誠實列出來。
這比一千字的隱私政策更有說服力。
