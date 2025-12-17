/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' // Disabled to allow dynamic API routes
  output: 'standalone', // Enable standalone output for Docker

  // Image configuration for Docker environment
  images: {
    unoptimized: true, // Disable image optimization in Docker to avoid issues with volume-mounted images
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
  },
};


export default nextConfig; // ✅ ES Module export