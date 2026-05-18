import Link from 'next/link';
import type { JSX } from 'react';

export const metadata = {
  title: 'Posthumous — 隱私架構',
};

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="shell prose">
      <p className="line">這不是隱私政策。這是隱私架構。</p>
      <div className="spacer" />
      <p className="line dim">
        一般 app 寫一份「我們承諾⋯」式的隱私政策。本作品的承諾不在文案,而在程式碼結構。
        以下每一條都能在 repo 裡驗證。
      </p>

      <h2 className="section-header">我們不做什麼</h2>
      <p className="line">不在任何伺服器儲存你的資料。</p>
      <p className="line">不使用 cookie(零個,連「必要 cookie」都沒有)。</p>
      <p className="line">不接 GA / Plausible / Vercel Analytics 等流量分析。</p>
      <p className="line">不寫 request log(不論 access log 還是 application log)。</p>
      <p className="line">不用你的資料訓練任何模型。</p>

      <h2 className="section-header">五層防護</h2>
      <p className="line">
        <strong>第一層 · 瀏覽器解析:</strong>{' '}
        Twitter archive 直接在你的瀏覽器解壓、抽特徵。原始 tweet / 訊息文字
        從來不離開這個分頁。
      </p>
      <p className="line">
        <strong>第二層 · 無狀態後端:</strong>{' '}
        <code>/api/chat</code> 唯一的工作是把瀏覽器送來的特徵摘要轉發給 Anthropic。
        沒有資料庫、沒有 Redis、沒有檔案系統寫入。
      </p>
      <p className="line">
        <strong>第三層 · 自動清除:</strong>{' '}
        記憶體中的特徵與對話只活在當前分頁。閒置 5 分鐘、按重整、關分頁,
        全部清空(localStorage、sessionStorage、IndexedDB、Cache Storage 一起清)。
      </p>
      <p className="line">
        <strong>第四層 · Zero Data Retention:</strong>{' '}
        Anthropic API 設定要求 ZDR(請求 + 回應不長期保留)。
        正式上線前必須提供書面 ZDR addendum 連結。
      </p>
      <p className="line">
        <strong>第五層 · 開源 + 可驗證:</strong>{' '}
        整個 codebase 都在{' '}
        <a href="https://github.com/ivan9527945/the-cache">GitHub</a>。
        你可以在 DevTools Network 分頁實測每個 byte 離開瀏覽器的時機。
      </p>

      <h2 className="section-header">誠實的限制</h2>
      <p className="line dim">完美的隱私不存在。即便做完上面這些,還是有以下風險:</p>
      <p className="line">公司網路可能透過 SSL 中間人看到流量。</p>
      <p className="line">瀏覽器 extension 可能讀 DOM。</p>
      <p className="line">
        Anthropic 的 ZDR 是「不長期保留」,不是「完全不見」。
      </p>
      <p className="line">伺服器主機商(Vercel / Fly.io)擁有實體存取權。</p>
      <div className="spacer" />
      <p className="line dim">這個專案的承諾是「我們做了能做的一切」,不是「絕對安全」。</p>

      <h2 className="section-header">怎麼驗證</h2>
      <p className="line">1. 開 DevTools 的 Network 分頁,跑一遍上傳流程。</p>
      <p className="line">2. 看 <code>/api/chat</code> 的 request body — 只有純統計。</p>
      <p className="line">3. 讀 source code:<code>src/extract</code>、<code>web/app/api/chat</code>、<code>web/lib/useAutoCleanup.ts</code>。</p>
      <p className="line">4. 想完全不信任 hosted 版本?clone 下來自己跑。</p>

      <div className="spacer" />
      <p className="line">
        <Link href="/">← 回首頁</Link>
      </p>
    </main>
  );
}
