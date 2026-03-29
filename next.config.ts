import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const sitemapRewriteBase = process.env.SITEMAP_REWRITE_BASE_URL?.replace(/\/+$/, '');

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
      {
        protocol: 'https',
        hostname: 'theequestrian-articles-images.s3.ap-southeast-2.amazonaws.com',
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
  async rewrites() {
    if (!sitemapRewriteBase) {
      return [];
    }
    return {
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: `${sitemapRewriteBase}/sitemap.xml`,
        },
        {
          source: '/sitemap/:path*',
          destination: `${sitemapRewriteBase}/sitemap/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withBundleAnalyzer(nextConfig);
