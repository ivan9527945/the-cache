// 部署側硬規:出自 docs/03-privacy-architecture.md §8。
//
// CSP 移到 middleware.ts(per-request nonce,符合 Next.js 15 inline RSC payload)。
// 這裡只留與 nonce 無關的靜態 security headers。

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  poweredByHeader: false,
  // 根目錄有自己的 package-lock.json(CLI 工具),這裡明確標 web/ 為 workspace root
  // 避免 Next 在啟動時印「detected multiple lockfiles」警告。
  outputFileTracingRoot: process.cwd(),
  // 共用的 src/actTwo / src/extract / src/ghost 用 TS bundler 慣例:
  // import 寫 './foo.js',實檔是 './foo.ts'。讓 webpack 也照這個方式解析。
  // 另外:../src/ 從自己位置往上找不到 node_modules(根目錄不裝 deps),
  // 明確把 web/node_modules 加進 resolve.modules,讓 jszip / @anthropic-ai/sdk 找得到。
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    return config;
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
