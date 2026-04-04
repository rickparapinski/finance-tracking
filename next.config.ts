import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "postgres"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
