import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'fs/promises': false,
        'timers/promises': false,
      };
    }
    return config;
  },
  serverExternalPackages: ['prisma', '@prisma/client'],
  outputFileTracingIncludes: {
    '/prisma': ['prisma/schema.prisma'],
    '/*': ['./src/generated/prisma/**', './src/generated/prisma/runtime/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fgxvzejucaxteqvnhojt.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
