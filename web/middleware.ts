// 部署側硬規:CSP 用 per-request nonce(對齊 docs/03-privacy-architecture.md §8「production 收緊」)。
//
// 為什麼需要這個 middleware:
// Next.js 15 production HTML 會自己塞 inline <script> 帶 RSC payload + hydration data。
// 靜態 `script-src 'self'` 會把這些擋掉、整個 app 跑不起來。
// 解法:middleware 每個 request 生 nonce → Next.js 自動把 nonce 套到它注入的 inline script。
// 'strict-dynamic' 讓 nonce 過的 script 可以動態 import 其他 chunk,但任何外來 inline 都還是擋。
//
// 代價:所有頁面被迫變 dynamic,沒有 static cache。對這個專案無感(沒大流量、沒重 SSR)。

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, '');

  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-eval' 'unsafe-inline'`;

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

// 不攔 _next/static/_next/image/favicon(這些不是 HTML,沒 inline script 問題)。
// 也跳過 router prefetch(已經 hydrate 過的 navigation,重 set CSP 沒意義且影響 cache)。
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
