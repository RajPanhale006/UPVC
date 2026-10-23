import type { NextConfig } from "next";

const offlineMobileBuild = process.env.CAPACITOR_OFFLINE_BUILD === "1";

const nextConfig: NextConfig = {
  /** Bundled inside offline APK only. Web / live-mobile deploy uses standard `next build`. */
  ...(offlineMobileBuild ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
