import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Skip static generation for dynamic routes
  output: 'standalone',
};

export default nextConfig;
