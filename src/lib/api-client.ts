/// <reference types="astro/client" />
import { treaty } from "@elysiajs/eden";
import type { App } from "../server/api/app";

// Eden Treaty prepends `https://` to path-only bases, so `/api` resolves
// to `https://api/...` in the browser and crashes checkout with
// ERR_NAME_NOT_RESOLVED. Use an absolute origin instead.
const base = import.meta.env.DEV
  ? "http://localhost:4321/api"
  : `${import.meta.env.SITE ?? "https://pluggedaudio.store"}/api`;

export const api = treaty<App>(base);
