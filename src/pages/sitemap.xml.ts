import type { APIRoute } from "astro";
import { api } from "../lib/api-client";
import { SITE_ORIGIN } from "../lib/site";

export const prerender = false;

// Public static pages included in the sitemap. `/track` is a public
// order-tracking utility (kept); `/search` and demo pages `/1`/`/2`/`/3`
// are excluded (no SEO value) and Disallowed in robots.txt.
const STATIC_PAGES = [
  "/contact",
  "/faq",
  "/shipping",
  "/returns-refunds",
  "/privacy-policy",
  "/terms-of-service",
  "/track",
];

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? SITE_ORIGIN;

  // Fetch product slugs + categories via the Eden treaty seam (same
  // routes the storefront uses). Brands are dropped — there is no
  // canonical `/products/brand/[slug]` route, only a query-string
  // filter which would disagree with the listing page's own canonical.
  // Follow-up: a lightweight /api/products/slugs endpoint would avoid
  // fetching full product payloads (brand/images/variants) just to
  // read .slug — noted in /tmp/seo-summary.md.
  const categoriesRes = await api.categories.get().catch((error) => {
    console.warn("[sitemap] categories fetch failed", error);
    return null;
  });

  // Paginate products — productListQuerySchema caps limit at 100.
  const products: { slug: string }[] = [];
  const limit = 100;
  let offset = 0;
  while (true) {
    const res = await api.products.get({ query: { limit, offset } }).catch((error) => {
      console.warn("[sitemap] products fetch failed", error);
      return null;
    });
    const batch = res?.data?.products ?? [];
    products.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  const categories = categoriesRes?.data ?? [];

  const entries: Array<{ loc: string; priority: number }> = [];

  // Homepage — no trailing slash to match Layout's canonical (Astro.url.pathname).
  entries.push({ loc: `${origin}`, priority: 1.0 });
  entries.push({ loc: `${origin}/products`, priority: 0.9 });

  for (const p of products) {
    entries.push({ loc: `${origin}/products/${escapeXml(p.slug)}`, priority: 0.8 });
  }
  // Canonical category route is /products/category/[slug] (not the
  // /products?category= filter query).
  for (const c of categories) {
    entries.push({
      loc: `${origin}/products/category/${escapeXml(c.slug)}`,
      priority: 0.6,
    });
  }
  for (const path of STATIC_PAGES) {
    entries.push({ loc: `${origin}${path}`, priority: 0.5 });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
