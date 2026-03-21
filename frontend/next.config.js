/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/geojson/:path*',
        destination: 'http://localhost:3001/geojson/:path*',
      },
    ];
  },
};

export default nextConfig;
