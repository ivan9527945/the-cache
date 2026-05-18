import type { JSX } from 'react';
import EndingClient from './EndingClient';

// 不能用 force-static。middleware.ts 發 per-request CSP nonce,
// 跟靜態 HTML 的 build-time 注入互斥(static page 沒 request context,nonce 套不上)。

export const metadata = {
  title: 'Posthumous',
};

export default function EndingPage(): JSX.Element {
  return <EndingClient />;
}
