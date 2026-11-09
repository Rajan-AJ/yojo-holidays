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

  // Baseline security headers on every response. (HTTPS + HSTS are handled by
  // Vercel on its domains.) A full Content-Security-Policy needs per-request
  // nonces, which would make every page dynamic; revisit with analytics (Phase 13).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },

  experimental: {
    // Pages prerender from the database at build time, in parallel workers.
    // Small databases (local `prisma dev`) can't take many connections at
    // once, so the worker count can be capped with NEXT_BUILD_CPUS.
    // Unset = Next's default (all cores), right for a real PostgreSQL server.
    ...(process.env.NEXT_BUILD_CPUS && { cpus: Number(process.env.NEXT_BUILD_CPUS) }),
  },

  images: {
    formats: ["image/avif", "image/webp"],
    // Required allowlist since Next 16. 75 is the default quality.
    qualities: [75],
    remotePatterns: [
      // PLACEHOLDER photography (src/content/home.ts and prisma/seed.ts). Remove
      // once the client's images live in the media store, and add that host
      // (e.g. Vercel Blob / S3) instead.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
    ],
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
