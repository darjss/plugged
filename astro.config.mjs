// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import { solidPrimitivesExportStarShim } from "./src/lib/rolldown-export-star-shim.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://pluggedaudio.store",
  adapter: cloudflare(),
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss(), solidPrimitivesExportStarShim()],
  },
});
