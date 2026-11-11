import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false,
  outputFileTracingRoot: path.join(__dirname),
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
};

export default nextConfig;
