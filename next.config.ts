import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'react-icons', 
      'recharts',
      '@react-email/components',
      '@react-email/render',
    ],
  },
  // Production optimizations
  compiler: {
    // Remove console logs in production for smaller bundles
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Modularize imports to enable tree-shaking
  // Note: Removed react-icons modularization as it conflicts with Turbopack
  // optimizePackageImports handles this automatically
  modularizeImports: {},
  // Turbopack configuration (Next.js 16 default)
  // Empty config to silence the webpack warning
  turbopack: {},
};

export default nextConfig;
