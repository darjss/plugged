import { defineMiddleware } from "astro:middleware";
import { getAuth } from "./server/lib/auth";

/**
 * Paths that should never be edge-cached — user-specific or dynamic content.
 */
function isCacheablePath(pathname: string): boolean {
  return (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/order/") &&
    !pathname.startsWith("/payment/") &&
    !pathname.startsWith("/og/") &&
    pathname !== "/login" &&
    pathname !== "/checkout" &&
    pathname !== "/cart" &&
    pathname !== "/profile" &&
    pathname !== "/order-tracking"
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    context.locals.session = null;
    context.locals.user = null;
    return next();
  }

  const url = new URL(context.request.url);

  // Edge-cache storefront HTML via Cache API (caches.default).
  // This stores responses at the edge POP nearest the user, so
  // repeat visits are served without hitting the Worker at all.
  if (context.request.method === "GET" && isCacheablePath(url.pathname)) {
    try {
      const cache = (caches as unknown as { default: Cache }).default;
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) {
        const hitResponse = new Response(cached.body, cached);
        hitResponse.headers.set("X-Edge-Cache", "HIT");
        return hitResponse;
      }

      // MISS — render, then cache the result.
      const session = await getAuth().api.getSession({
        headers: context.request.headers,
      });
      context.locals.session = session?.session ?? null;
      context.locals.user = session?.user ?? null;

      const response = await next();
      if (response.status === 200) {
        response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        response.headers.set("X-Edge-Cache", "MISS");
        (context as unknown as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(
          cache.put(cacheKey, response.clone()),
        );
      }
      return response;
    } catch {
      // Cache API not available (e.g. local dev) — fall through.
    }
  }

  // Non-cacheable paths: auth + render normally.
  const session = await getAuth().api.getSession({
    headers: context.request.headers,
  });

  context.locals.session = session?.session ?? null;
  context.locals.user = session?.user ?? null;

  return next();
});
