import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.225.52.80', '100.65.143.81'],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${process.env.API_URL || "http://localhost:8000"}/:path*` },
    ];
  },
};

export default nextConfig;
