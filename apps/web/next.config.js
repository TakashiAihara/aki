/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aki/shared'],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
