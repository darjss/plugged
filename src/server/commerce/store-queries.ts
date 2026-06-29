import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { db } from "../db";
import {
  brand,
  cart,
  cartItem,
  category,
  product,
  productCategory,
  productVariant,
} from "../db/schema";
import { NotFoundError, OutOfStockError } from "../lib/errors";
import { now } from "../lib/datetime";
import { imageOrderBy } from "../lib/drizzle-helpers";
import { productListQuerySchema } from "./validation";

const publicProductColumns = {
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

const activeProduct = () => eq(product.status, "active");
const DEFAULT_PAGE_SIZE = 12;

export async function getProducts(input: v.InferOutput<typeof productListQuerySchema> = {}) {
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const offset = input.offset ?? 0;

  const conditions = [activeProduct()];

  if (input.featured !== undefined) {
    conditions.push(eq(product.featured, input.featured));
  }

  if (input.brandSlug) {
    const brandRow = await db.query.brand.findFirst({
      where: eq(brand.slug, input.brandSlug),
      columns: { id: true },
    });
    // Unknown slug → always-false condition (not an early return []) so the
    // function has a single return type and Eden Treaty infers it cleanly.
    conditions.push(brandRow ? eq(product.brandId, brandRow.id) : eq(product.id, ""));
  }

  if (input.categorySlug) {
    const categoryRow = await db.query.category.findFirst({
      where: eq(category.slug, input.categorySlug),
      columns: { id: true },
    });
    let productIds: string[] = [];
    if (categoryRow) {
      const links = await db
        .select({ productId: productCategory.productId })
        .from(productCategory)
        .where(eq(productCategory.categoryId, categoryRow.id));
      productIds = links.map((row) => row.productId);
    }
    conditions.push(productIds.length > 0 ? inArray(product.id, productIds) : eq(product.id, ""));
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
      images: { orderBy: imageOrderBy },
      variants: { where: (variant, { eq }) => eq(variant.active, true) },
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
      images: { orderBy: imageOrderBy },
      variants: { where: (variant, { eq }) => eq(variant.active, true) },
    },
  });

  const rank = new Map(uniqueIds.map((id, index) => [id, index]));
  return rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

export async function getCategories() {
  return db.select().from(category).orderBy(category.name);
}

export async function getBrands() {
  return db.select().from(brand).orderBy(brand.name);
}

export async function getProductBySlug(slug: string) {
  const result = await db.query.product.findFirst({
    columns: publicProductColumns,
    where: and(activeProduct(), eq(product.slug, slug)),
    with: {
      brand: true,
      categories: { with: { category: true } },
      iemSpec: true,
      images: { orderBy: imageOrderBy },
      variants: { where: (variant, { eq }) => eq(variant.active, true) },
    },
  });

  if (!result) throw new NotFoundError("product", slug);
  return result;
}

export async function createCart(userId: null | string) {
  const date = now();
  const id = nanoid();
  const anonymousToken = nanoid(32);

  await db.insert(cart).values({
    anonymousToken,
    createdAt: date,
    id,
    updatedAt: date,
    userId,
  });

  return getCartByToken(anonymousToken);
}

export async function getCartByToken(cartToken: string) {
  const result = await db.query.cart.findFirst({
    where: eq(cart.anonymousToken, cartToken),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: {
                orderBy: imageOrderBy,
              },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!result) throw new NotFoundError("cart", cartToken);
  return result;
}

// Single-sources the cart fetch + NotFoundError throw that addCartItem,
// updateCartItem, and removeCartItem all need.
async function getCartOrThrow(
  cartToken: string,
  withRelations: Record<string, unknown> = { items: true },
) {
  const result = await db.query.cart.findFirst({
    where: eq(cart.anonymousToken, cartToken),
    with: withRelations as never,
  });
  if (!result) throw new NotFoundError("cart", cartToken);
  return result;
}

export async function addCartItem(cartToken: string, variantId: string, quantity: number) {
  const currentCart = await getCartOrThrow(cartToken);

  const variant = await db.query.productVariant.findFirst({
    where: and(eq(productVariant.id, variantId), eq(productVariant.active, true)),
    with: {
      product: true,
    },
  });

  if (!variant || variant.product.status !== "active") {
    throw new NotFoundError("variant", variantId);
  }

  const availableQuantity = variant.stockQuantity - variant.reservedQuantity;

  if (availableQuantity < quantity) {
    throw new OutOfStockError(variantId, quantity, availableQuantity);
  }

  const date = now();
  const existing = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.cartId, currentCart.id), eq(cartItem.variantId, variantId)),
  });

  if (existing) {
    const nextQuantity = existing.quantity + quantity;

    if (availableQuantity < nextQuantity) {
      throw new OutOfStockError(variantId, nextQuantity, availableQuantity);
    }

    await db
      .update(cartItem)
      .set({
        quantity: nextQuantity,
        updatedAt: date,
      })
      .where(eq(cartItem.id, existing.id));
  } else {
    await db.insert(cartItem).values({
      cartId: currentCart.id,
      createdAt: date,
      id: nanoid(),
      productId: variant.productId,
      quantity,
      updatedAt: date,
      variantId,
    });
  }

  await db.update(cart).set({ updatedAt: date }).where(eq(cart.id, currentCart.id));

  return getCartByToken(cartToken);
}

export async function updateCartItem(cartToken: string, itemId: string, quantity: number) {
  const currentCart = await getCartOrThrow(cartToken);

  const existing = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
    with: {
      variant: true,
    },
  });

  if (!existing) throw new NotFoundError("cart-item", itemId);

  const availableQuantity = existing.variant.stockQuantity - existing.variant.reservedQuantity;

  if (availableQuantity < quantity) {
    throw new OutOfStockError(existing.variantId, quantity, availableQuantity);
  }

  const date = now();

  await db
    .update(cartItem)
    .set({
      quantity,
      updatedAt: date,
    })
    .where(eq(cartItem.id, existing.id));
  await db.update(cart).set({ updatedAt: date }).where(eq(cart.id, currentCart.id));

  return getCartByToken(cartToken);
}

export async function removeCartItem(cartToken: string, itemId: string) {
  const currentCart = await getCartOrThrow(cartToken);

  const existing = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
  });

  if (!existing) throw new NotFoundError("cart-item", itemId);

  await db
    .delete(cartItem)
    .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)));
  await db.update(cart).set({ updatedAt: now() }).where(eq(cart.id, currentCart.id));

  return getCartByToken(cartToken);
}
