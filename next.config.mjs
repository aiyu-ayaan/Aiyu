/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: export' to enable API routes
  output: 'standalone', // For Docker deployment
  };
  
  export default nextConfig; // ✅ ES Module export
  