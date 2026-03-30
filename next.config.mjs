/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const cdnUrl = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/+$/, '');

const nextConfig = {
  // output: 'export' // Disabled to allow dynamic API routes
  output: 'standalone', // Enable standalone output for Docker
  allowedDevOrigins: ['192.168.31.54'],
  assetPrefix: isProduction && cdnUrl ? cdnUrl : undefined,

  // Enhanced performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'react-icons', 'simple-icons'],
  },

  // Image configuration - enable optimization with sharp
  images: {
    unoptimized: false, // Enable image optimization (sharp is installed)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains for flexibility
      }
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and caching
  compress: true,
  poweredByHeader: false,

  // Headers for performance
  async headers() {
    const headers = [];

    headers.push({
      source: '/images/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: isProduction ? 'public, max-age=86400, stale-while-revalidate=43200' : 'no-store',
        },
      ],
    });

    headers.push({
      source: '/uploads/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: isProduction ? 'public, max-age=86400, stale-while-revalidate=43200' : 'no-store',
        },
      ],
    });

    return headers;
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // Bundle analyzer for optimization (used with --webpack flag)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        framer: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: 'framer-motion',
          chunks: 'all',
          priority: 20,
        },
        icons: {
          test: /[\\/]node_modules[\\/](react-icons|lucide-react)[\\/]/,
          name: 'icons',
          chunks: 'all',
          priority: 15,
        },
      };
    }
    return config;
  },
};


export default nextConfig; // ✅ ES Module export
