import { and, desc, eq, inArray, sql } from "drizzle-orm";
import * as v from "valibot";
import { db } from "../db";
import { brand, category, product } from "../db/schema";
import { NotFoundError } from "../lib/errors";
import { imageOrderBy } from "../lib/drizzle-helpers";
import { productListQuerySchema } from "./validation";

export const publicProductColumns = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  description: true,
  status: true,
  basePriceMnt: true,
  compareAtPriceMnt: true,
  currency: true,
  featured: true,
  oldSlugs: true,
} as const;

export const activeProduct = () => eq(product.status, "active");
export const DEFAULT_PAGE_SIZE = 12;

/**
 * List active products with optional category/brand/featured filters
 * and limit/offset pagination. Category and brand are filtered by slug
 * via subqueries so the relational `with` shape stays stable.
 *
 * Unknown slugs resolve to an empty subquery (an always-false
 * condition, instead of an early `return []`) so the function has a
 * single return type and Eden Treaty can infer the response shape
 * cleanly.
 */
export async function getProducts(input: v.InferOutput<typeof productListQuerySchema> = {}) {
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const offset = input.offset ?? 0;

  const conditions = [activeProduct()];

  if (input.featured !== undefined) {
    conditions.push(eq(product.featured, input.featured));
  }

  // Slug filters as inline subqueries (no extra round trips). An unknown
  // slug yields an empty subquery result, so the condition matches
  // nothing — same semantics as the previous lookup-then-filter version.
  // Inner tables/columns are raw identifiers: the relational query
  // builder remaps embedded Column refs in a `where` SQL onto the
  // primary table alias, which would mangle references to other tables.
  // Only the slug values are bound parameters.
  if (input.brandSlug) {
    conditions.push(
      sql`${product.brandId} IN (
        SELECT id FROM brand
        WHERE slug = ${input.brandSlug}
      )`,
    );
  }

  if (input.categorySlug) {
    conditions.push(
      sql`${product.id} IN (
        SELECT product_id FROM product_category
        WHERE category_id IN (
          SELECT id FROM category
          WHERE slug = ${input.categorySlug}
        )
      )`,
    );
  }

  return db.query.product.findMany({
    columns: publicProductColumns,
    orderBy: [desc(product.featured), desc(product.createdAt)],
    where: and(...conditions),
    limit,
    offset,
    with: {
      brand: true,
      iemSpec: true,
      images: {
        orderBy: imageOrderBy,
      },
      variants: {
        where: (variant, { eq }) => eq(variant.active, true),
      },
    },
  });
}

export async function getProductsByIds(ids: string[], limit = DEFAULT_PAGE_SIZE) {
  const uniqueIds = Array.from(new Set(ids)).slice(0, limit);
  if (uniqueIds.length === 0) return [];

  const rows = await db.query.product.findMany({
    columns: publicProductColumns,
    where: and(activeProduct(), inArray(product.id, uniqueIds)),
    with: {
      brand: true,
      iemSpec: true,
      images: {
        orderBy: imageOrderBy,
      },
      variants: {
        where: (variant, { eq }) => eq(variant.active, true),
      },
    },
  });

  const rank = new Map(uniqueIds.map((id, index) => [id, index]));
  return rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/**
 * All categories, ordered by name. Used by the storefront filter bar
 * and category landing-page navigation.
 */
export async function getCategories() {
  return db.select().from(category).orderBy(category.name);
}

/**
 * All brands, ordered by name. Used by the storefront filter bar.
 */
export async function getBrands() {
  return db.select().from(brand).orderBy(brand.name);
}

export async function getProductBySlug(slug: string) {
  const result = await db.query.product.findFirst({
    columns: publicProductColumns,
    where: and(activeProduct(), eq(product.slug, slug)),
    with: {
      brand: true,
      categories: {
        with: {
          category: true,
        },
      },
      iemSpec: true,
      images: {
        orderBy: imageOrderBy,
      },
      variants: {
        where: (variant, { eq }) => eq(variant.active, true),
      },
    },
  });

  if (!result) throw new NotFoundError("product", slug);
  return result;
}
