import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
};

// PWA Configuration - conditionally apply if next-pwa is installed
// Run: npm install next-pwa to enable PWA features
let config = nextConfig;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // Disable PWA in development
    publicExcludes: ["!robots.txt", "!sitemap.xml"],
    buildExcludes: [/middleware-manifest\.json$/],
  });
  config = withPWA(nextConfig);
} catch (e) {
  // next-pwa not installed, continue without PWA wrapper
  console.warn("next-pwa not found. PWA features disabled. Install with: npm install next-pwa");
}

export default config;
