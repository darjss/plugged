import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import { product } from "../db/schema";
import { imageOrderBy } from "../lib/drizzle-helpers";
import { getEmbeddingData } from "./embedding";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
const EMBEDDING_DIMENSIONS = 768;
const VECTOR_BATCH_SIZE = 50;

type SearchEnv = Env & { AI?: Ai; VECTORIZE?: VectorizeIndex };

export async function rebuildSearchIndex() {
  const targetEnv = env as SearchEnv;
  if (!targetEnv.AI || !targetEnv.VECTORIZE) {
    return { ok: true, mode: "fallback", indexed: 0 };
  }

  const rows = (await getIndexableProducts()) as IndexProduct[];
  let indexed = 0;

  for (let i = 0; i < rows.length; i += VECTOR_BATCH_SIZE) {
    const batch = rows.slice(i, i + VECTOR_BATCH_SIZE);
    const texts = batch.map((row) => productIndexText(row));
    const embeddings = getEmbeddingData(await targetEnv.AI.run(EMBEDDING_MODEL, { text: texts }));
    const vectors = batch
      .map((row, index) => {
        const values = embeddings[index];
        if (!values || values.length !== EMBEDDING_DIMENSIONS) return null;
        return {
          id: row.id,
          values,
          metadata: {
            brand: row.brand?.name ?? "",
            name: row.name,
            slug: row.slug,
            status: row.status,
          },
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (vectors.length > 0) {
      await targetEnv.VECTORIZE.upsert(vectors);
    }
    indexed += vectors.length;
  }

  return { ok: true, mode: "vectorize", indexed };
}

export async function indexProduct(productId: string) {
  const targetEnv = env as SearchEnv;
  if (!targetEnv.AI || !targetEnv.VECTORIZE) return { ok: true, mode: "fallback", indexed: 0 };

  const row = (await getIndexableProduct(productId)) as IndexProduct | undefined;
  if (!row || row.status !== "active") {
    await removeProductFromIndex(productId);
    return { ok: true, mode: "vectorize", indexed: 0 };
  }

  const embedding = getEmbeddingData(
    await targetEnv.AI.run(EMBEDDING_MODEL, { text: productIndexText(row) }),
  );
  const values = embedding[0];
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    return { ok: true, mode: "vectorize", indexed: 0 };
  }
  await targetEnv.VECTORIZE.upsert([
    {
      id: row.id,
      values,
      metadata: {
        brand: row.brand?.name ?? "",
        name: row.name,
        slug: row.slug,
        status: row.status,
      },
    },
  ]);

  return { ok: true, mode: "vectorize", indexed: 1 };
}

export async function removeProductFromIndex(productId: string) {
  const vectorize = (env as SearchEnv).VECTORIZE;
  if (!vectorize) return { ok: true, mode: "fallback", deleted: 0 };
  await vectorize.deleteByIds([productId]);
  return { ok: true, mode: "vectorize", deleted: 1 };
}

async function getIndexableProducts() {
  return db.query.product.findMany({
    where: eq(product.status, "active"),
    orderBy: [desc(product.updatedAt)],
    with: {
      brand: true,
      categories: { with: { category: true } },
      iemSpec: true,
      images: {
        orderBy: imageOrderBy,
      },
      variants: true,
    },
  });
}

async function getIndexableProduct(productId: string) {
  return db.query.product.findFirst({
    where: eq(product.id, productId),
    with: {
      brand: true,
      categories: { with: { category: true } },
      iemSpec: true,
      images: {
        orderBy: imageOrderBy,
      },
      variants: true,
    },
  });
}

type IndexProduct = NonNullable<Awaited<ReturnType<typeof getIndexableProduct>>>;

export function productIndexText(row: IndexProduct) {
  const spec = row.iemSpec;
  const values = [
    row.name,
    row.brand?.name,
    row.shortDescription,
    row.description,
    ...row.categories.map((link) => link.category.name),
    spec?.driverType,
    spec?.driverConfig,
    spec?.frequencyResponse,
    spec?.connector,
    spec?.cable,
    spec?.shellMaterial,
    spec?.soundSignature,
    spec?.fit,
    spec?.includedAccessories,
  ];
  return values.filter(Boolean).join(" | ");
}
