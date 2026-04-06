import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Impede Turbopack de fazer bundle de pacotes nativos Node.js
  serverExternalPackages: ["@react-pdf/renderer", "pdfjs-dist", "pg"],
};

export default nextConfig;
