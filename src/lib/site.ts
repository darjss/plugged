/**
 * Site-wide constants + helpers shared by SEO surfaces (Layout canonical/OG,
 * sitemap, robots, product JSON-LD). `Astro.site` is always defined given
 * `astro.config.mjs` sets `site`, but we keep a constant fallback for any
 * non-Astro call site (e.g. a future cron) and to avoid duplicating the
 * literal across files.
 */
export const SITE_ORIGIN = "https://pluggedaudio.store";

/**
 * On-demand API base. Pages render from D1 at request time, so product
 * inventory stays fresh and a build-time API outage no longer wipes
 * every product page. In dev the Elysia API is mounted on the same
 * Astro server at `[::1]:4321`.
 */
export function apiBase(site?: URL): string {
  if (import.meta.env.DEV) return "http://[::1]:4321";
  return site?.origin ?? SITE_ORIGIN;
}

/**
 * Resolve a path-or-URL to an absolute URL against the site origin.
 * Falls back to `fallback` (a pathname) when `value` is unset.
 */
export function absoluteUrl(value: string | undefined, fallback: string, site?: URL): string {
  const origin = site?.origin ?? SITE_ORIGIN;
  if (!value) return new URL(fallback, origin).href;
  try {
    return new URL(value, origin).href;
  } catch {
    return new URL(fallback, origin).href;
  }
}

/**
 * JSON-LD safe for `set:html`: `JSON.stringify` does not escape `<` or `/`,
 * so a string field containing `</script>` breaks out of the
 * `<script type="application/ld+json">` element. Escape `<` and `-->`.
 */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "\\u003c\\u002d\\u002d\\u003e");
}
