import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=*",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://cdn.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.razorpay.com",
      "font-src 'self' https://fonts.gstatic.com data: https://*.razorpay.com",
      "img-src 'self' data: https: blob: https://*.razorpay.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
      "child-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com blob:",
      "connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://razorpay.com https://*.supabase.co wss://*.supabase.co https://*.trycloudflare.com https://trycloudflare.com http://127.0.0.1:* http://localhost:*",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres.goxgiohyshxzqzesernz:Vaynex%402026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres',
    SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.goxgiohyshxzqzesernz:Vaynex%402026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres',
    SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME || 'postgres',
    SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST || 'aws-1-ap-northeast-2.pooler.supabase.com',
    SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT || '6543',
    SUPABASE_DB_USER: process.env.SUPABASE_DB_USER || 'postgres.goxgiohyshxzqzesernz',
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD || 'Vaynex@2026',
    ADMIN_DEFAULT_EMAIL: process.env.ADMIN_DEFAULT_EMAIL || 'admin@sritayigrand.com',
    ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'GrandHotel@Kadiri2026!',
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: '/403-forbidden',
        destination: '/admin/403',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
        'pg-native': false,
      };
    }
    return config;
  },
};

export default nextConfig;
