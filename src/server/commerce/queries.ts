import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { db } from "../db";
import {
  cart,
  cartItem,
  deliveryFeeMnt,
  order,
  orderItem,
  payment,
  paymentStatuses,
  product,
  productVariant,
} from "../db/schema";
import { ConflictError, NotFoundError, OutOfStockError } from "../lib/errors";
import { createQpayInvoice } from "../integrations/qpay";
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
    /**
     * List active products. Pass `{ featured: true }` to restrict to
     * products flagged for the homepage featured grid.
     */
    async getProducts(filter?: { featured?: boolean }) {
      const featuredOnly = filter?.featured === true ? eq(product.featured, true) : undefined;

      return db.query.product.findMany({
        columns: publicProductColumns,
        orderBy: [desc(product.featured), desc(product.createdAt)],
        where: featuredOnly ? and(activeProduct(), featuredOnly) : activeProduct(),
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
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });

      if (!result) throw new NotFoundError("product", slug);
      return result;
    },

    async createCart(userId: null | string) {
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
      const result = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    orderBy: (image, { asc, desc }) => [
                      desc(image.isPrimary),
                      asc(image.sortOrder),
                    ],
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
    },

    async addCartItem(cartToken: string, variantId: string, quantity: number) {
      const currentCart = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: { items: true },
      });

      if (!currentCart) throw new NotFoundError("cart", cartToken);

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

      return this.getCartByToken(cartToken);
    },

    async updateCartItem(cartToken: string, itemId: string, quantity: number) {
      const currentCart = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: { items: true },
      });

      if (!currentCart) throw new NotFoundError("cart", cartToken);

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

      return this.getCartByToken(cartToken);
    },

    async removeCartItem(cartToken: string, itemId: string) {
      const currentCart = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: { items: true },
      });

      if (!currentCart) throw new NotFoundError("cart", cartToken);

      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
      });

      if (!existing) throw new NotFoundError("cart-item", itemId);

      await db
        .delete(cartItem)
        .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)));
      await db.update(cart).set({ updatedAt: now() }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    async createOrder(input: v.InferOutput<typeof checkoutInputSchema>, userId: null | string) {
      const currentCart = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, input.cartToken),
        with: {
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (!currentCart) throw new NotFoundError("cart", input.cartToken);
      if (currentCart.items.length === 0) throw new ConflictError("Cart is empty");

      const unavailable = currentCart.items.find((item) => {
        const availableQuantity = item.variant.stockQuantity - item.variant.reservedQuantity;
        return (
          item.product.status !== "active" ||
          !item.variant.active ||
          availableQuantity < item.quantity
        );
      });

      if (unavailable) {
        const availableQuantity =
          unavailable.variant.stockQuantity - unavailable.variant.reservedQuantity;
        throw new OutOfStockError(unavailable.variantId, unavailable.quantity, availableQuantity);
      }

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

  payments: {
    /**
     * Fetch a payment (with its order) by payment number.
     */
    async getPaymentByNumber(paymentNumber: string) {
      const result = await db.query.payment.findFirst({
        where: eq(payment.paymentNumber, paymentNumber),
        with: {
          order: true,
        },
      });

      if (!result) throw new NotFoundError("payment", paymentNumber);
      return result;
    },

    /**
     * Update a payment's status. Throws on invalid status to keep the
     * picklist values shared from the server schema.
     */
    async updatePaymentStatus(paymentId: string, nextStatus: (typeof paymentStatuses)[number]) {
      if (!paymentStatuses.includes(nextStatus)) {
        throw new ConflictError(`Invalid payment status: ${nextStatus}`);
      }

      const date = now();
      const patch: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: date,
      };
      if (nextStatus === "success") patch.paidAt = date;

      await db.update(payment).set(patch).where(eq(payment.id, paymentId));

      return db.query.payment.findFirst({ where: eq(payment.id, paymentId) });
    },

    /**
     * Create a QPay invoice for an order's outstanding payment and persist
     * the invoice id + QR data on the payment record. Returns the QR data
     * for the client to render.
     */
    async createQpayInvoiceForOrder(orderNumber: string) {
      const targetOrder = await db.query.order.findFirst({
        where: eq(order.orderNumber, orderNumber),
        with: {
          payments: true,
        },
      });

      if (!targetOrder) throw new NotFoundError("order", orderNumber);

      const targetPayment = targetOrder.payments.find((p) => p.provider === "qpay");
      if (!targetPayment) throw new NotFoundError("qpay-payment", orderNumber);

      const invoice = await createQpayInvoice(targetPayment.amountMnt, targetPayment.paymentNumber);

      const date = now();
      await db
        .update(payment)
        .set({
          qpayInvoiceId: invoice.invoiceId,
          qpayQrImage: invoice.qrImage,
          qpayQrText: invoice.qrText,
          qpayUrlsJson: invoice.shortUrl,
          updatedAt: date,
        })
        .where(eq(payment.id, targetPayment.id));

      return {
        invoiceId: invoice.invoiceId,
        paymentNumber: targetPayment.paymentNumber,
        qrImage: invoice.qrImage,
        qrText: invoice.qrText,
        shortUrl: invoice.shortUrl,
      };
    },
  },
};
