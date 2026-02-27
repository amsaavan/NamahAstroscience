import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next from picking the repo root due to multiple lockfiles.
    root: process.cwd(),
  },
};

export default nextConfig;
