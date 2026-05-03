import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
