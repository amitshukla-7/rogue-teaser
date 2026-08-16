import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only proxy /api/* to an external backend when NEXT_PUBLIC_API_URL is explicitly set.
  // When empty (local dev / Vercel with built-in routes), Next.js handles /api/* directly.
  ...(process.env.NEXT_PUBLIC_API_URL
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
