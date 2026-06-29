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

interface ErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

/**
 * Pull the human-readable message out of an Eden error (typed as
 * unknown because the server's `.onError()` uses a dynamic status code
 * — see server/api/app.ts — so Eden infers the 200 type as the error
 * envelope). The runtime shapes are correct.
 */
export function edErrorMessage(
  error: { value: unknown } | null | undefined,
  fallback: string,
): string {
  const envelope = error?.value as ErrorEnvelope | undefined;
  return envelope?.error?.message ?? fallback;
}
