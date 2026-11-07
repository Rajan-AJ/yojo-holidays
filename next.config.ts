import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: pages are dynamic by default; we opt into caching with
  // "use cache" in the data layer. Gives a static shell + streamed data (PPR).
  cacheComponents: true,
  partialPrefetching: true,

  // The brief's URL scheme uses trailing slashes (/international-tours/vietnam/).
  // One canonical form avoids duplicate URLs; the other form 308-redirects.
  trailingSlash: true,

  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    // Add the media storage host (e.g. Vercel Blob / S3) here when chosen.
    remotePatterns: [],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
