/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

import { cloudflare } from "@cloudflare/vite-plugin";

const apiHosts = [
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "api.coingecko.com",
  "api.twelvedata.com",
  "www.thesportsdb.com",
];

export default defineConfig({
  plugins: [react(), VitePWA({
    filename: "sw.js",
    manifest: false,
    injectRegister: false,
    registerType: "autoUpdate",
    workbox: {
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff,woff2,png}"],
      navigateFallback: "/index.html",
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) => request.method === "GET" && apiHosts.includes(url.hostname),
          handler: "CacheFirst",
          options: {
            cacheName: "flapify-api-cache",
            cacheableResponse: {
              statuses: [0, 200],
            },
            expiration: {
              maxEntries: 64,
              maxAgeSeconds: 60 * 60 * 24,
            },
          },
        },
      ],
    },
  }), cloudflare()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});