import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db";
import { cart, cartItem, productVariant } from "../db/schema";
import { NotFoundError, OutOfStockError } from "../lib/errors";
import { now } from "../lib/datetime";
import { imageOrderBy } from "../lib/drizzle-helpers";

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

/**
 * Fetch a cart (with its bare items) by its anonymous token or throw
 * NotFoundError. Single-sources the duplicated fetch + throw used by
 * addCartItem / updateCartItem / removeCartItem.
 */
export async function getCartWithItems(cartToken: string) {
  const result = await db.query.cart.findFirst({
    where: eq(cart.anonymousToken, cartToken),
    with: { items: true },
  });
  if (!result) throw new NotFoundError("cart", cartToken);
  return result;
}

/**
 * Fetch a cart with the richer item relations (product + variant) that
 * checkout needs to price and validate lines. Throws NotFoundError when
 * the token doesn't match a cart.
 */
export async function getCartForCheckout(cartToken: string) {
  const result = await db.query.cart.findFirst({
    where: eq(cart.anonymousToken, cartToken),
    with: {
      items: {
        with: {
          product: true,
          variant: true,
        },
      },
    },
  });
  if (!result) throw new NotFoundError("cart", cartToken);
  return result;
}

export async function addCartItem(cartToken: string, variantId: string, quantity: number) {
  const currentCart = await getCartWithItems(cartToken);

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
  const currentCart = await getCartWithItems(cartToken);

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
  const currentCart = await getCartWithItems(cartToken);

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
