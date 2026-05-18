# Posthumous Web

Next.js 前端,當前實作:

- `/` — 入口
- `/act-two` — 幕二體驗(七波 + 收場,fade-in、嚴格按 docs/02 pacing)

幕二的腳本與 player engine 來自 `../src/actTwo/`,前端只是其中一個 renderer。
Terminal 版本見 `../scripts/act-two.ts`。

## 開發

```bash
cd web
npm install
npm run dev
```

開 http://localhost:3000/act-two

## 設計鐵則(出自 docs/02-act-two-pacing.md)

- 預設要慢。`prefers-reduced-motion` 才把 pause 縮到 10%
- 不要加 skip 按鈕(除了 reduced-motion 使用者,且要明確標記)
- 不要加 loading 進度條、背景音樂、音效
- 不要加 animation(除了文字 fade in)
- 不要讓使用者滑回上一波
