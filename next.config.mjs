/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' // Disabled to allow dynamic API routes
  output: 'standalone', // Enable standalone output for Docker
};


export default nextConfig; // ✅ ES Module export