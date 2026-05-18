import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Posthumous',
  description: '一個關於「死後的你」的互動敘事體驗。',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
