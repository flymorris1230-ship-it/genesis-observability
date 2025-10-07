import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_OBS_EDGE_URL: process.env.NEXT_PUBLIC_OBS_EDGE_URL || 'http://localhost:8787',
    NEXT_PUBLIC_OBS_EDGE_API_KEY: process.env.NEXT_PUBLIC_OBS_EDGE_API_KEY || '',
  },
};

export default nextConfig;
