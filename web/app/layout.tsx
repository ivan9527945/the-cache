import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import AutoCleanupBoundary from '../components/AutoCleanupBoundary';
import './globals.scss';

// middleware.ts 用 per-request nonce 發 CSP,static prerender 沒 request 沒 nonce attribute,
// 線上會被自家 CSP 擋。整個 tree 強制 dynamic,讓 Next.js 在 SSR 階段套上 nonce。
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Posthumous',
  description: '一個關於「死後的你」的互動敘事體驗。',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="zh-Hant">
      <body>
        <AutoCleanupBoundary />
        {children}
      </body>
    </html>
  );
}
