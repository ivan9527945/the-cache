/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
