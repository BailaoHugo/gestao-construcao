import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from bundling these Node.js-only packages
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
