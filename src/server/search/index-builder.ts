import { env } from "cloudflare:workers";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { product, productImage } from "../db/schema";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
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
    await targetEnv.VECTORIZE.upsert(
      batch.map((row, index) => ({
        id: row.id,
        values: embeddings[index] ?? [],
        metadata: {
          brand: row.brand?.name ?? "",
          name: row.name,
          slug: row.slug,
          status: row.status,
        },
      })),
    );
    indexed += batch.length;
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
  await targetEnv.VECTORIZE.upsert([
    {
      id: row.id,
      values: embedding[0] ?? [],
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
        orderBy: [desc(productImage.isPrimary), asc(productImage.sortOrder)],
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
        orderBy: [desc(productImage.isPrimary), asc(productImage.sortOrder)],
      },
      variants: true,
    },
  });
}

type IndexProduct = NonNullable<Awaited<ReturnType<typeof getIndexableProduct>>>;

function getEmbeddingData(output: unknown) {
  if (output && typeof output === "object" && "data" in output && Array.isArray(output.data)) {
    return output.data.filter((item): item is number[] => Array.isArray(item));
  }
  return [];
}

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
