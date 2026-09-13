// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Mobile devices ke liye optimize
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-alert-dialog",
    ],
  },
  // Compression enable karein
  compress: true,
  // Development ke liye
  poweredByHeader: false,
  // Fast refresh optimize
  reactStrictMode: true,
  // Large dependencies ko external rakhein
  serverExternalPackages: ["@supabase/supabase-js"],
  // Allow mobile device access on local network
  allowedDevOrigins: ["192.168.100.*", "localhost", "*.local"],
};

export default nextConfig;
