import type { APIRoute } from "astro";

export const prerender = false;

interface ProductSummary {
  slug: string;
}

interface NamedSlug {
  slug: string;
}

const STATIC_PAGES = [
  "/contact",
  "/faq",
  "/shipping",
  "/returns-refunds",
  "/privacy-policy",
  "/terms-of-service",
  "/track",
];

function apiBase(origin: string): string {
  if (import.meta.env.DEV) return "http://[::1]:4321";
  return origin;
}

async function fetchAllProducts(base: string): Promise<ProductSummary[]> {
  const out: ProductSummary[] = [];
  const limit = 100;
  let offset = 0;
  // Paginate — productListQuerySchema caps limit at 100.
  while (true) {
    try {
      const res = await fetch(`${base}/api/products?limit=${limit}&offset=${offset}`);
      if (!res.ok) break;
      const data = (await res.json()) as { products: ProductSummary[] };
      const batch = data.products ?? [];
      out.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    } catch {
      break;
    }
  }
  return out;
}

async function fetchSlugs(base: string, path: string): Promise<NamedSlug[]> {
  try {
    const res = await fetch(`${base}${path}`);
    if (!res.ok) return [];
    const data = (await res.json()) as NamedSlug[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? "https://pluggedaudio.store";
  const base = apiBase(origin);

  const [products, categories, brands] = await Promise.all([
    fetchAllProducts(base),
    fetchSlugs(base, "/api/categories"),
    fetchSlugs(base, "/api/brands"),
  ]);

  const lastmod = new Date().toISOString().split("T")[0];

  const entries: Array<{ loc: string; priority: number; lastmod?: string }> = [];

  entries.push({ loc: `${origin}/`, priority: 1.0, lastmod });
  entries.push({ loc: `${origin}/products`, priority: 0.9, lastmod });

  for (const p of products) {
    entries.push({ loc: `${origin}/products/${escapeXml(p.slug)}`, priority: 0.8, lastmod });
  }
  for (const c of categories) {
    entries.push({
      loc: `${origin}/products?category=${escapeXml(c.slug)}`,
      priority: 0.6,
      lastmod,
    });
  }
  for (const b of brands) {
    entries.push({
      loc: `${origin}/products?brand=${escapeXml(b.slug)}`,
      priority: 0.6,
      lastmod,
    });
  }
  for (const path of STATIC_PAGES) {
    entries.push({ loc: `${origin}${path}`, priority: 0.5, lastmod });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
