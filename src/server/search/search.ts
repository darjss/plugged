import { env } from "cloudflare:workers";
import { and, desc, eq, or, sql } from "drizzle-orm";

import { commerceQueries } from "../commerce";
import { db } from "../db";
import { brand, category, iemSpec, product, productCategory } from "../db/schema";
import { getEmbeddingData } from "./embedding";
import { expandSearchQuery } from "./query-expand";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

type SearchEnv = Env & { AI?: Ai; VECTORIZE?: VectorizeIndex };

export async function searchProducts(input: { q: string; limit?: number }) {
  const q = input.q.trim();
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  if (!q) return [];

  const vectorIds = await vectorSearchIds(q, limit).catch(() => []);
  if (vectorIds.length > 0) return commerceQueries.store.getProductsByIds(vectorIds, limit);

  const terms = await expandSearchQuery(q);
  const ids = await keywordSearchIds(terms, limit);
  return commerceQueries.store.getProductsByIds(ids, limit);
}

async function vectorSearchIds(query: string, limit: number) {
  const targetEnv = env as SearchEnv;
  if (!targetEnv.AI || !targetEnv.VECTORIZE) return [];

  const embedding = await targetEnv.AI.run(EMBEDDING_MODEL, { text: query });
  const values = getEmbeddingData(embedding)[0];
  if (!values) return [];

  const matches = await targetEnv.VECTORIZE.query(values, {
    topK: limit,
    returnMetadata: "all",
    filter: { status: "active" },
  });
  return matches.matches.map((match) => match.id).filter(Boolean);
}

async function keywordSearchIds(terms: string[], limit: number) {
  const cleaned = terms
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (cleaned.length === 0) return [];

  // Concatenate all searchable columns into one string per row and LIKE-match
  // each term against it. This collapses the OR tree from terms×columns (up to
  // 12×9 = 108, exceeding D1's max expression depth of 100) to just `terms`
  // (≤5). COALESCE guards against NULLs from left-joined tables.
  const searchable = sql<string>`coalesce(${product.name}, '') || ' ' || coalesce(${product.shortDescription}, '') || ' ' || coalesce(${product.description}, '') || ' ' || coalesce(${brand.name}, '') || ' ' || coalesce(${category.name}, '') || ' ' || coalesce(${iemSpec.driverType}, '') || ' ' || coalesce(${iemSpec.driverConfig}, '') || ' ' || coalesce(${iemSpec.soundSignature}, '') || ' ' || coalesce(${iemSpec.fit}, '')`;

  const conditions = cleaned.map(
    (term) => sql`lower(${searchable}) like lower(${"%" + term + "%"})`,
  );

  const rows = await db
    .select({ id: product.id })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(productCategory, eq(productCategory.productId, product.id))
    .leftJoin(category, eq(category.id, productCategory.categoryId))
    .leftJoin(iemSpec, eq(iemSpec.productId, product.id))
    .where(and(eq(product.status, "active"), or(...conditions)))
    .groupBy(product.id)
    .orderBy(
      desc(sql<number>`max(case when ${product.featured} then 1 else 0 end)`),
      desc(product.createdAt),
    )
    .limit(limit);

  return rows.map((row) => row.id);
}
