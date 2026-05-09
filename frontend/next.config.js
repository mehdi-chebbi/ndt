/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        // Exclude /api/clip/* from rewrites - these are handled by Route Handler
        // with custom timeout to support long-running clipping operations
        source: '/api/:path((?!clip/).*)*',
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
