// 部署側硬規:出自 docs/03-privacy-architecture.md §8。
// dev 必須放寬,讓 HMR / inline scripts / eval 能跑;production 收緊。

const isProd = process.env.NODE_ENV === 'production';

const scriptSrc = isProd
  ? "script-src 'self'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
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
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    return config;
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
