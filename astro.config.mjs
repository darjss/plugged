// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import solid from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  site: "https://pluggedaudio.store",
  adapter: cloudflare(),
  integrations: [solid()],
});
