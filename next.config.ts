import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Same-origin proxy route (src/app/api/s3/file) uses a ?key= query string.
    // Omitting `search` allows any query string under this path.
    localPatterns: [
      {
        pathname: "/api/s3/file",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.fly.storage.tigris.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.t3.storage.dev",
        pathname: "/**",
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
