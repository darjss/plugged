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

/**
 * Pull the human-readable message out of an Eden error. `error.value` is
 * the typed envelope union from the server's error handler plugin
 * (see server/api/plugins/errors.ts); the runtime guard keeps this safe
 * for untyped/unexpected error bodies (network failures, HTML 500 pages).
 */
export function edErrorMessage(
  error: { value: unknown } | null | undefined,
  fallback: string,
): string {
  const value = error?.value;
  if (value && typeof value === "object" && "error" in value) {
    const inner = (value as { error: unknown }).error;
    if (
      inner &&
      typeof inner === "object" &&
      "message" in inner &&
      typeof (inner as { message: unknown }).message === "string"
    ) {
      return (inner as { message: string }).message;
    }
  }
  return fallback;
}

/**
 * Canonical Eden Treaty unwrap: resolves to the typed `data` payload or
 * throws an `Error` carrying the server envelope's message (via
 * `edErrorMessage`). Use this in query/mutation functions instead of
 * hand-rolling `if (error) throw error`.
 */
export async function unwrap<TOut>(
  call: Promise<{ data: TOut | null; error: { value: unknown } | null }>,
): Promise<NonNullable<TOut>> {
  const { data, error } = await call;
  if (error || data === null || data === undefined) {
    throw new Error(edErrorMessage(error, "Request failed"));
  }
  return data;
}

/** Message for errors thrown by `unwrap` (or anything Error-shaped). */
export function queryErrorMessage(error: unknown, fallback = "Request failed"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
