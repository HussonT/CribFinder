import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "**.craigslist.org" },
      { hostname: "**.zillow.com" },
      { hostname: "**.zillowstatic.com" },
      { hostname: "**.streeteasy.com" },
      { hostname: "**.muscache.com" },
      { hostname: "photos.zillowstatic.com" },
      { hostname: "images1.apartments.com" },
    ],
  },
};

export default nextConfig;
