/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const cdnUrl = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/+$/, '');
const cdnHostname = cdnUrl ? (() => {
  try {
    return new URL(cdnUrl).hostname;
  } catch {
    return '';
  }
})() : '';

// Disable Next "standalone" output on Windows : NFT manifest generation
// can fail on Windows paths (spaces/backslashes). Use standalone on
// non-Windows hosts (e.g., Docker images/CI) but avoid it for local
// Windows builds to prevent missing `middleware.js.nft.json` errors.
const standaloneOutput = process.platform === 'win32' ? undefined : 'standalone';

const nextConfig = {
  // output: 'export' // Disabled to allow dynamic API routes
  output: standaloneOutput,
  allowedDevOrigins: ['192.168.31.54'],
  assetPrefix: isProduction && cdnUrl ? cdnUrl : undefined,

  // Enhanced performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'react-icons', 'simple-icons'],
    // Import backups can include many images and exceed the 10MB proxy clone default.
    proxyClientMaxBodySize: '999mb',
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
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      ...(cdnHostname ? [{
        protocol: 'https',
        hostname: cdnHostname,
      }] : []),
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and caching
  compress: true,
  poweredByHeader: false,
  httpAgentOptions: {
    keepAlive: true,
  },

  // Headers for performance
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/blogs',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/blogs/:path*',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/about-me',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/contact-us',
        permanent: true,
      },
      {
        source: '/app',
        destination: '/apps',
        permanent: true,
      },
      {
        source: '/app/:path*',
        destination: '/apps/:path*',
        permanent: true,
      },
      {
        source: '/project',
        destination: '/projects',
        permanent: true,
      },
      {
        source: '/project/:path*',
        destination: '/projects/:path*',
        permanent: true,
      },
      {
        source: '/deployments',
        destination: '/apps',
        permanent: true,
      },
      {
        source: '/deployments/:path*',
        destination: '/apps/:path*',
        permanent: true,
      },
      {
        source: '/live-deployments',
        destination: '/apps',
        permanent: true,
      },
      {
        source: '/live-deployments/:path*',
        destination: '/apps/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    const headers = [];
    const publicHtmlCacheValue = isProduction
      ? 'public, max-age=0, s-maxage=0, must-revalidate'
      : 'no-store';

    headers.push({
      source: '/',
      headers: [
        {
          key: 'Cache-Control',
          value: publicHtmlCacheValue,
        },
        {
          key: 'Link',
          value: '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json", </docs/api>; rel="service-doc"; type="text/markdown", </.well-known/oauth-protected-resource>; rel="describedby"; type="application/json", </.well-known/agent-skills/index.json>; rel="describedby"; type="application/json", </.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
        },
      ],
    });

    // Add Cache-Control for public HTML route prefixes using Next's
    // wildcard (`:path*`) style instead of a regex with capturing groups
    // which Next disallows in `source`.
    const publicHtmlPrefixes = [
      'about-me',
      'apps',
      'blogs',
      'contact-us',
      'gallery',
      'github',
      'projects',
      'work-in-progress',
    ];

    for (const p of publicHtmlPrefixes) {
      headers.push({
        source: `/${p}/:path*`,
        headers: [
          {
            key: 'Cache-Control',
            value: publicHtmlCacheValue,
          },
        ],
      });
      // Also cover the exact prefix root (e.g. '/blogs')
      headers.push({
        source: `/${p}`,
        headers: [
          {
            key: 'Cache-Control',
            value: publicHtmlCacheValue,
          },
        ],
      });
    }

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
};


export default nextConfig; // ✅ ES Module export
