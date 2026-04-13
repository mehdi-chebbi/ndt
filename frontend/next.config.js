/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: false,
  async rewrites() {
    return [
      {
        // Exclude /api/clip/* and /api/ai/* from rewrites — handled by Route Handlers
        // clip: custom timeout for long-running clipping operations
        // ai: bypass buffering so SSE streams work in real-time
        source: '/api/:path((?!clip/|ai/).*)*',
        destination: 'http://backend:3001/api/:path*',
      },
      {
        source: '/geojson/:path*',
        destination: 'http://backend:3001/geojson/:path*',
      },
    ];
  },
};

export default nextConfig;
