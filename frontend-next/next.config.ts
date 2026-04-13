import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a minimal standalone server in .next/standalone for Docker.
  output: 'standalone',
  // The standalone output does not copy non-bundled files by default.
  // Keep this list minimal.
  experimental: {
    // Trim telemetry in prod builds.
  },
};

export default nextConfig;
