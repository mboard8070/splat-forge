import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wlt-ai-cdn.art',
      },
      {
        protocol: 'https',
        hostname: '*.worldlabs.ai',
      },
    ],
  },
};

export default nextConfig;
