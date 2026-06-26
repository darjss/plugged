import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { db } from "../db";
import {
  brand,
  category,
  iemSpec,
  product,
  productCategory,
  productImage,
  productVariant,
} from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { deleteR2Object, putProductImage } from "./r2";
import {
  adminCreateProductSchema,
  adminListProductsSchema,
  adminUpdateProductSchema,
} from "./validation";

const now = () => new Date();

type CreateInput = v.InferOutput<typeof adminCreateProductSchema>;
type UpdateInput = v.InferOutput<typeof adminUpdateProductSchema>;
type ListFilters = v.InferOutput<typeof adminListProductsSchema>;

export const adminCommerceQueries = {
  /* === Catalog lookups === */

  async listBrands() {
    return db
      .select({ id: brand.id, slug: brand.slug, name: brand.name })
      .from(brand)
      .orderBy(asc(brand.name));
  },

  async listCategories() {
    return db
      .select({ id: category.id, slug: category.slug, name: category.name })
      .from(category)
      .orderBy(asc(category.name));
  },

  /* === Product list === */

  async listProducts(filters: ListFilters) {
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const conditions = [];

    if (filters.status) conditions.push(eq(product.status, filters.status));
    if (filters.brandId) conditions.push(eq(product.brandId, filters.brandId));
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(product.name, term),
          like(product.slug, term),
          like(product.shortDescription, term),
        )!,
      );
    }
    if (filters.categoryId) {
      conditions.push(
        sql`${product.id} IN (
          SELECT ${productCategory.productId} FROM ${productCategory}
          WHERE ${productCategory.categoryId} = ${filters.categoryId}
        )`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.query.product.findMany({
      where,
      orderBy: [desc(product.createdAt)],
      limit,
      offset,
      columns: {
        id: true,
        slug: true,
        name: true,
        status: true,
        basePriceMnt: true,
        compareAtPriceMnt: true,
        featured: true,
        createdAt: true,
      },
      with: {
        brand: { columns: { id: true, name: true } },
        images: {
          columns: { id: true, url: true, isPrimary: true, sortOrder: true },
          orderBy: [desc(productImage.isPrimary), asc(productImage.sortOrder)],
          limit: 1,
        },
        variants: {
          columns: { id: true, stockQuantity: true, reservedQuantity: true, active: true },
        },
      },
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(product)
      .where(where);

    const items = rows.map((row) => {
      const totalStock = row.variants.reduce(
        (sum, v) => sum + (v.active ? v.stockQuantity - v.reservedQuantity : 0),
        0,
      );
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        basePriceMnt: row.basePriceMnt,
        compareAtPriceMnt: row.compareAtPriceMnt,
        featured: row.featured,
        createdAt: row.createdAt,
        brand: row.brand,
        thumbnail: row.images[0]?.url ?? null,
        stock: totalStock,
        variantCount: row.variants.length,
      };
    });

    return { items, total: Number(count), limit, offset };
  },

  /* === Single product with all relations === */

  async getProduct(id: string) {
    const row = await db.query.product.findFirst({
      where: eq(product.id, id),
      with: {
        brand: true,
        categories: { with: { category: true } },
        iemSpec: true,
        images: {
          orderBy: [desc(productImage.isPrimary), asc(productImage.sortOrder)],
        },
        variants: {
          orderBy: [asc(productVariant.createdAt)],
        },
      },
    });

    if (!row) throw new NotFoundError("product", id);

    return {
      ...row,
      categoryIds: row.categories.map((c) => c.categoryId),
    };
  },

  /* === Create === */

  async createProduct(input: CreateInput) {
    const date = now();
    const productId = nanoid();

    // Slug uniqueness check
    const existing = await db.query.product.findFirst({
      where: eq(product.slug, input.slug),
      columns: { id: true },
    });
    if (existing) throw new ConflictError(`Slug already in use: ${input.slug}`);

    await db.insert(product).values({
      id: productId,
      slug: input.slug,
      brandId: input.brandId ?? null,
      name: input.name,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      status: input.status,
      basePriceMnt: input.basePriceMnt,
      compareAtPriceMnt: input.compareAtPriceMnt ?? null,
      currency: "MNT",
      featured: input.featured ?? false,
      createdAt: date,
      updatedAt: date,
    });

    await this.syncDependents(productId, input, date);

    return this.getProduct(productId);
  },

  /* === Update === */

  async updateProduct(id: string, input: UpdateInput) {
    const existing = await db.query.product.findFirst({
      where: eq(product.id, id),
      columns: { id: true },
    });
    if (!existing) throw new NotFoundError("product", id);

    if (input.slug !== undefined && input.slug !== null) {
      const clash = await db.query.product.findFirst({
        where: and(eq(product.slug, input.slug), sql`${product.id} != ${id}`),
        columns: { id: true },
      });
      if (clash) throw new ConflictError(`Slug already in use: ${input.slug}`);
    }

    const date = now();
    const patch: Record<string, unknown> = { updatedAt: date };
    if (input.name !== undefined) patch.name = input.name;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.brandId !== undefined) patch.brandId = input.brandId ?? null;
    if (input.shortDescription !== undefined)
      patch.shortDescription = input.shortDescription ?? null;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.basePriceMnt !== undefined) patch.basePriceMnt = input.basePriceMnt;
    if (input.compareAtPriceMnt !== undefined)
      patch.compareAtPriceMnt = input.compareAtPriceMnt ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.featured !== undefined) patch.featured = input.featured;

    await db.update(product).set(patch).where(eq(product.id, id));

    await this.syncDependents(id, input, date);

    return this.getProduct(id);
  },

  /* === Archive (soft delete) === */

  async archiveProduct(id: string) {
    const existing = await db.query.product.findFirst({
      where: eq(product.id, id),
      columns: { id: true },
    });
    if (!existing) throw new NotFoundError("product", id);

    await db
      .update(product)
      .set({ status: "archived", updatedAt: now() })
      .where(eq(product.id, id));

    return this.getProduct(id);
  },

  /* === Images === */

  async uploadImage(
    productId: string,
    file: { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  ) {
    const existing = await db.query.product.findFirst({
      where: eq(product.id, productId),
      columns: { id: true },
      with: { images: { columns: { id: true, isPrimary: true, sortOrder: true } } },
    });
    if (!existing) throw new NotFoundError("product", productId);

    const uploaded = await putProductImage(productId, file);
    const imageId = nanoid();
    const isPrimary = existing.images.length === 0;
    const sortOrder = existing.images.length;

    await db.insert(productImage).values({
      id: imageId,
      productId,
      r2Key: uploaded.r2Key,
      url: uploaded.url,
      alt: null,
      sortOrder,
      isPrimary,
      createdAt: now(),
    });

    return { id: imageId, r2Key: uploaded.r2Key, url: uploaded.url, isPrimary, sortOrder };
  },

  async deleteImage(productId: string, imageId: string) {
    const image = await db.query.productImage.findFirst({
      where: and(eq(productImage.id, imageId), eq(productImage.productId, productId)),
    });
    if (!image) throw new NotFoundError("product-image", imageId);

    if (image.r2Key) {
      try {
        await deleteR2Object(image.r2Key);
      } catch (error) {
        console.error("r2 delete failed", { r2Key: image.r2Key, error: String(error) });
      }
    }

    await db.delete(productImage).where(eq(productImage.id, imageId));

    // If we removed the primary, promote the next image.
    if (image.isPrimary) {
      const next = await db.query.productImage.findFirst({
        where: eq(productImage.productId, productId),
        orderBy: asc(productImage.sortOrder),
      });
      if (next) {
        await db.update(productImage).set({ isPrimary: true }).where(eq(productImage.id, next.id));
      }
    }

    return { ok: true };
  },

  /* === Internal: sync variants / iemSpec / categories === */

  async syncDependents(
    productId: string,
    input: {
      variants?: UpdateInput["variants"];
      iemSpec?: UpdateInput["iemSpec"];
      categoryIds?: UpdateInput["categoryIds"];
    },
    date: Date,
  ) {
    // Categories: full replace when provided.
    if (input.categoryIds !== undefined) {
      await db.delete(productCategory).where(eq(productCategory.productId, productId));
      if (input.categoryIds.length > 0) {
        await db
          .insert(productCategory)
          .values(input.categoryIds.map((categoryId) => ({ productId, categoryId })));
      }
    }

    // IEM spec: upsert when provided (null clears it).
    if (input.iemSpec !== undefined) {
      const value = input.iemSpec;
      if (value === null) {
        await db.delete(iemSpec).where(eq(iemSpec.productId, productId));
      } else if (typeof value === "object") {
        const existing = await db.query.iemSpec.findFirst({
          where: eq(iemSpec.productId, productId),
          columns: { productId: true },
        });
        const row = {
          productId,
          driverType: value.driverType ?? null,
          driverConfig: value.driverConfig ?? null,
          impedanceOhms: value.impedanceOhms ?? null,
          sensitivityDb: value.sensitivityDb ?? null,
          frequencyResponse: value.frequencyResponse ?? null,
          connector: value.connector ?? null,
          cable: value.cable ?? null,
          mic: value.mic ?? null,
          shellMaterial: value.shellMaterial ?? null,
          nozzleMaterial: value.nozzleMaterial ?? null,
          soundSignature: value.soundSignature ?? null,
          fit: value.fit ?? null,
          includedAccessories: value.includedAccessories ?? null,
          squiglinkFile: value.squiglinkFile ?? null,
        };
        if (existing) {
          await db.update(iemSpec).set(row).where(eq(iemSpec.productId, productId));
        } else {
          await db.insert(iemSpec).values(row);
        }
      }
    }

    // Variants: when provided, upsert by id; new variants get fresh ids.
    if (input.variants !== undefined) {
      const current = await db.query.productVariant.findMany({
        where: eq(productVariant.productId, productId),
        columns: { id: true },
      });
      const keepIds = new Set(input.variants.map((v) => v.id).filter(Boolean) as string[]);
      const toDelete = current.filter((v) => !keepIds.has(v.id)).map((v) => v.id);

      if (toDelete.length > 0) {
        await db
          .delete(productVariant)
          .where(
            and(eq(productVariant.productId, productId), inArray(productVariant.id, toDelete)),
          );
      }

      for (const variant of input.variants) {
        if (variant.id) {
          await db
            .update(productVariant)
            .set({
              sku: variant.sku,
              name: variant.name,
              priceMnt: variant.priceMnt,
              compareAtPriceMnt: variant.compareAtPriceMnt ?? null,
              stockQuantity: variant.stockQuantity,
              active: variant.active ?? true,
              updatedAt: date,
            })
            .where(eq(productVariant.id, variant.id));
        } else {
          await db.insert(productVariant).values({
            id: nanoid(),
            productId,
            sku: variant.sku,
            name: variant.name,
            priceMnt: variant.priceMnt,
            compareAtPriceMnt: variant.compareAtPriceMnt ?? null,
            stockQuantity: variant.stockQuantity,
            reservedQuantity: 0,
            active: variant.active ?? true,
            createdAt: date,
            updatedAt: date,
          });
        }
      }
    }
  },
};
