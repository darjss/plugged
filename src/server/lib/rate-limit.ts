import { env } from "cloudflare:workers";
import { RateLimitError } from "./errors";

const WINDOW_SECONDS = 60;

/**
 * KV-counter rate limit keyed by client IP. Reads the counter, throws
 * RateLimitError (429) when the limit is reached, otherwise writes the
 * incremented count back with a fresh 60s TTL.
 *
 * KV is eventually consistent, so concurrent requests across POPs can
 * slightly overshoot the limit — acceptable here since this guards
 * against enumeration/scraping, not for billing-grade quotas. Each
 * write also refreshes the TTL, so a sustained abuser stays blocked
 * until they back off for a full window (stricter than a fixed window,
 * which is fine for abuse prevention).
 */
export async function enforceIpRateLimit(
  request: Request,
  scope: string,
  maxPerMinute = 10,
): Promise<void> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = `ratelimit:${scope}:${ip}`;

  const current = Number((await env.CACHE.get(key)) ?? 0);
  if (current >= maxPerMinute) {
    throw new RateLimitError();
  }

  await env.CACHE.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS });
}
