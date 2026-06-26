import { env } from "cloudflare:workers";
import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { commerceQueries } from "../commerce/queries";
import { db } from "../db";
import { brand, category, iemSpec, product, productCategory } from "../db/schema";
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

function getEmbeddingData(output: unknown) {
  if (output && typeof output === "object" && "data" in output && Array.isArray(output.data)) {
    return output.data.filter((item): item is number[] => Array.isArray(item));
  }
  return [];
}

async function keywordSearchIds(terms: string[], limit: number) {
  const cleaned = terms
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (cleaned.length === 0) return [];

  const conditions = cleaned.flatMap((term) => {
    const pattern = `%${term}%`;
    return [
      like(product.name, pattern),
      like(product.shortDescription, pattern),
      like(product.description, pattern),
      like(brand.name, pattern),
      like(category.name, pattern),
      like(iemSpec.driverType, pattern),
      like(iemSpec.driverConfig, pattern),
      like(iemSpec.soundSignature, pattern),
      like(iemSpec.fit, pattern),
    ];
  });

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
