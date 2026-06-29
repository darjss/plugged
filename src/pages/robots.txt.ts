import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? "https://pluggedaudio.store";
  const body = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/
Disallow: /order/
Disallow: /profile
Disallow: /checkout
Disallow: /track
Disallow: /404
Disallow: /403
Disallow: /500

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
