import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { getDb } from "../db";
import {
  cart,
  cartItem,
  deliveryFeeMnt,
  order,
  orderItem,
  payment,
  product,
  productVariant,
} from "../db/schema";
import { checkoutInputSchema } from "./validation";

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
} as const;

const now = () => new Date();
const activeProduct = () => eq(product.status, "active");

export const commerceQueries = {
  store: {
    async getProducts() {
      return getDb().query.product.findMany({
        columns: publicProductColumns,
        orderBy: [desc(product.featured), desc(product.createdAt)],
        where: activeProduct(),
        with: {
          brand: true,
          iemSpec: true,
          images: {
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });
    },

    async getProductBySlug(slug: string) {
      return getDb().query.product.findFirst({
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
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });
    },

    async createCart(userId: null | string) {
      const db = getDb();
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

      return this.getCartByToken(anonymousToken);
    },

    async getCartByToken(cartToken: string) {
      return getDb().query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    },

    async addCartItem(cartToken: string, variantId: string, quantity: number) {
      const db = getDb();
      const currentCart = await this.getCartByToken(cartToken);

      if (!currentCart) return null;

      const variant = await db.query.productVariant.findFirst({
        where: and(eq(productVariant.id, variantId), eq(productVariant.active, true)),
        with: {
          product: true,
        },
      });

      if (!variant || variant.product.status !== "active") return null;

      const availableQuantity = variant.stockQuantity - variant.reservedQuantity;

      if (availableQuantity < quantity) return null;

      const date = now();
      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.cartId, currentCart.id), eq(cartItem.variantId, variantId)),
      });

      if (existing) {
        const nextQuantity = existing.quantity + quantity;

        if (availableQuantity < nextQuantity) return null;

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

      return this.getCartByToken(cartToken);
    },

    async updateCartItem(cartToken: string, itemId: string, quantity: number) {
      const db = getDb();
      const currentCart = await this.getCartByToken(cartToken);

      if (!currentCart) return null;

      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
        with: {
          variant: true,
        },
      });

      if (!existing) return null;

      const availableQuantity = existing.variant.stockQuantity - existing.variant.reservedQuantity;

      if (availableQuantity < quantity) return null;

      const date = now();

      await db
        .update(cartItem)
        .set({
          quantity,
          updatedAt: date,
        })
        .where(eq(cartItem.id, existing.id));
      await db.update(cart).set({ updatedAt: date }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    async removeCartItem(cartToken: string, itemId: string) {
      const db = getDb();
      const currentCart = await this.getCartByToken(cartToken);

      if (!currentCart) return null;

      await db.delete(cartItem).where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)));
      await db.update(cart).set({ updatedAt: now() }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    async createOrder(input: v.InferOutput<typeof checkoutInputSchema>, userId: null | string) {
      const db = getDb();
      const currentCart = await this.getCartByToken(input.cartToken);

      if (!currentCart || currentCart.items.length === 0) return null;

      const unavailable = currentCart.items.find((item) => {
        const availableQuantity = item.variant.stockQuantity - item.variant.reservedQuantity;
        return item.product.status !== "active" || !item.variant.active || availableQuantity < item.quantity;
      });

      if (unavailable) return null;

      const date = now();
      const orderId = nanoid();
      const paymentId = nanoid();
      const subtotalMnt = currentCart.items.reduce(
        (sum, item) => sum + item.variant.priceMnt * item.quantity,
        0,
      );
      const totalMnt = subtotalMnt + deliveryFeeMnt;
      const orderNumber = `PLG-${nanoid(10).toUpperCase()}`;
      const paymentNumber = `PAY-${nanoid(10).toUpperCase()}`;

      await db.insert(order).values({
        address: input.address,
        checkoutToken: nanoid(32),
        createdAt: date,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone,
        deliveryFeeMnt,
        deliveryProvider: input.deliveryProvider,
        id: orderId,
        notes: input.notes ?? null,
        orderNumber,
        orderedAt: date,
        status: "pending",
        subtotalMnt,
        totalMnt,
        updatedAt: date,
        userId,
      });

      await db.insert(orderItem).values(
        currentCart.items.map((item) => ({
          createdAt: date,
          id: nanoid(),
          lineTotalMnt: item.variant.priceMnt * item.quantity,
          orderId,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          sku: item.variant.sku,
          unitPriceMnt: item.variant.priceMnt,
          variantId: item.variantId,
          variantName: item.variant.name,
        })),
      );

      await db.insert(payment).values({
        amountMnt: totalMnt,
        createdAt: date,
        id: paymentId,
        orderId,
        paymentNumber,
        provider: input.paymentProvider ?? "qpay",
        status: "pending",
        updatedAt: date,
      });

      await db.delete(cartItem).where(eq(cartItem.cartId, currentCart.id));

      for (const item of currentCart.items) {
        await db
          .update(productVariant)
          .set({
            stockQuantity: sql`${productVariant.stockQuantity} - ${item.quantity}`,
            updatedAt: date,
          })
          .where(eq(productVariant.id, item.variantId));
      }

      return db.query.order.findFirst({
        where: eq(order.id, orderId),
        with: {
          items: true,
          payments: true,
        },
      });
    },
  },
};
