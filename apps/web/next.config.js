/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@akimi/shared'],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
