/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.BUILD_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Add specific trusted domains instead of wildcard "**"
      // to avoid the GHSA-9g9p-9gw9-jx7f DoS vulnerability
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
    // Disable disk cache size growing unboundedly (GHSA-3x4c-7xq6-9pq8)
    minimumCacheTTL: 60,
  },
  // Explicitly opt out of experimental features that affect RSC deserialization
  experimental: {},
};

module.exports = nextConfig;
