import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server's HMR/asset requests when the app is opened from
  // another device on the LAN (e.g. a phone/tablet during testing) — without
  // this, Next.js blocks those cross-origin dev requests by default, which
  // breaks client-side hydration (and therefore any client-side data
  // fetching, e.g. to Turso) even though the page itself loads.
  allowedDevOrigins: ["192.168.0.190"],
};

export default nextConfig;
