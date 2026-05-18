import Link from 'next/link';

export default function Home(): JSX.Element {
  return (
    <main className="shell">
      <p className="line">Posthumous</p>
      <div className="spacer" />
      <p className="line dim">一個關於「死後的你」的互動敘事體驗。</p>
      <div className="spacer" />
      <p className="line">
        <Link href="/act-two">→ 跑一遍幕二</Link>
      </p>
    </main>
  );
}
