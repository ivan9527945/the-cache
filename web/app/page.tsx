import Link from 'next/link';
import type { JSX } from 'react';

export default function Home(): JSX.Element {
  return (
    <main className="shell">
      <p className="line">Posthumous</p>
      <div className="spacer" />
      <p className="line dim">一個關於「死後的你」的互動敘事體驗。</p>
      <div className="spacer" />
      <p className="line">
        <Link href="/upload">→ 開始(上傳你的 archive)</Link>
      </p>
      <p className="line">
        <Link href="/act-two">→ 跳過上傳,看一遍幕二 sample</Link>
      </p>
      <p className="line">
        <Link href="/ending">→ 跳到幕五:遺囑</Link>
      </p>
      <div className="spacer" />
      <p className="line dim">
        <Link href="/privacy">隱私架構</Link>
      </p>
    </main>
  );
}
