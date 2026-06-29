import type { APIRoute } from "astro";
import { SITE_ORIGIN } from "../lib/site";

// Origin is known at build time (astro.config.mjs sets `site`), so
// prerender this as a static asset instead of running a Worker per hit.
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? SITE_ORIGIN;
  const body = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/
Disallow: /order/
Disallow: /profile
Disallow: /checkout
Disallow: /search
Disallow: /1
Disallow: /2
Disallow: /3
Disallow: /404
Disallow: /403
Disallow: /500

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
