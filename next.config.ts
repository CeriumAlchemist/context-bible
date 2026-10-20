import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The verse pages read translation files from data/ at request time.
  outputFileTracingIncludes: { "/**": ["./data/translations/**/*"] },
};

export default nextConfig;
