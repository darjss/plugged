import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { db } from "../db";
import { cartItem, deliveryFeeMnt, order, orderItem, payment, productVariant } from "../db/schema";
import { ConflictError, NotFoundError, OutOfStockError } from "../lib/errors";
import { now } from "../lib/datetime";
import { getCartForCheckout } from "./cart";
import { checkoutInputSchema } from "./validation";

/**
 * Normalized line item used by createOrder regardless of whether the
 * source is a server-side cart (cartToken) or client-side items array.
 */
export async function resolveCheckoutLines(input: v.InferOutput<typeof checkoutInputSchema>) {
  if (input.items && input.items.length > 0) {
    // Client-side cart flow: look up each variant + its product from DB.
    const variants = await db.query.productVariant.findMany({
      where: inArray(
        productVariant.id,
        input.items.map((i) => i.variantId),
      ),
      with: { product: true },
    });

    const byId = new Map(variants.map((v) => [v.id, v]));
    const lines = input.items.map((requested) => {
      const variant = byId.get(requested.variantId);
      if (!variant) throw new NotFoundError("variant", requested.variantId);
      return {
        productId: variant.productId,
        quantity: requested.quantity,
        variantId: variant.id,
        variant,
        product: variant.product,
      };
    });

    return { lines, sourceCartId: null };
  }

  if (!input.cartToken) {
    throw new ConflictError("Checkout requires either cartToken or items.");
  }

  const currentCart = await getCartForCheckout(input.cartToken);

  if (currentCart.items.length === 0) throw new ConflictError("Cart is empty");

  return {
    lines: currentCart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId,
      variant: item.variant,
      product: item.product,
    })),
    sourceCartId: currentCart.id,
  };
}

export async function createOrder(
  input: v.InferOutput<typeof checkoutInputSchema>,
  userId: null | string,
) {
  const { lines, sourceCartId } = await resolveCheckoutLines(input);

  const unavailable = lines.find((line) => {
    const availableQuantity = line.variant.stockQuantity - line.variant.reservedQuantity;
    return (
      line.product.status !== "active" || !line.variant.active || availableQuantity < line.quantity
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
  const subtotalMnt = lines.reduce((sum, line) => sum + line.variant.priceMnt * line.quantity, 0);
  const totalMnt = subtotalMnt + deliveryFeeMnt;
  const orderNumber = `PLG-${nanoid(10).toUpperCase()}`;
  const paymentNumber = `PAY-${nanoid(10).toUpperCase()}`;
  const checkoutToken = nanoid(32);

  // SINGLE atomic batch: order + order_items + payment + cart clear
  // + stock decrements all in one `db.batch()`. A failure mid-batch
  // rolls back the entire checkout — no orphaned order rows, no
  // cleared cart without an order, no decremented stock without a
  // corresponding order item. Stock decrements are conditional on
  // `stockQuantity >= quantity` so concurrent checkouts can't
  // drive stock negative (the availability check above is a
  // read-then-write guard; the conditional UPDATE is the
  // write-time guard).
  const batchStmts: BatchItem<"sqlite">[] = [
    db.insert(order).values({
      address: input.address,
      checkoutToken,
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
    }),
    db.insert(orderItem).values(
      lines.map((line) => ({
        createdAt: date,
        id: nanoid(),
        lineTotalMnt: line.variant.priceMnt * line.quantity,
        orderId,
        productId: line.productId,
        productName: line.product.name,
        quantity: line.quantity,
        sku: line.variant.sku,
        unitPriceMnt: line.variant.priceMnt,
        variantId: line.variantId,
        variantName: line.variant.name,
      })),
    ),
    db.insert(payment).values({
      amountMnt: totalMnt,
      createdAt: date,
      id: paymentId,
      orderId,
      paymentNumber,
      provider: input.paymentProvider ?? "qpay",
      status: "pending",
      updatedAt: date,
    }),
  ];

  if (sourceCartId) {
    batchStmts.push(db.delete(cartItem).where(eq(cartItem.cartId, sourceCartId)));
  }

  batchStmts.push(
    ...lines.map((line) =>
      db
        .update(productVariant)
        .set({
          stockQuantity: sql`${productVariant.stockQuantity} - ${line.quantity}`,
          updatedAt: date,
        })
        .where(
          and(
            eq(productVariant.id, line.variantId),
            sql`${productVariant.stockQuantity} >= ${line.quantity}`,
          ),
        ),
    ),
  );

  await db.batch(batchStmts as unknown as readonly [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

  const created = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: {
      items: true,
      payments: true,
    },
  });
  if (!created) throw new NotFoundError("order", orderId);
  return created;
}

/**
 * List orders for a phone number. Used by the profile page (logged-in
 * customer's own phone) and the public tracking page (guest lookups by
 * phone). Orders are returned newest-first with items + payments.
 */
export async function getOrdersByPhone(phone: string) {
  return db.query.order.findMany({
    where: eq(order.customerPhone, phone),
    orderBy: [desc(order.createdAt)],
    with: {
      items: true,
      payments: true,
    },
  });
}

/**
 * Fetch a single order by its public order number, including line items
 * and payment records. Throws NotFoundError if no order matches.
 */
export async function getOrderByNumber(orderNumber: string) {
  const result = await db.query.order.findFirst({
    where: eq(order.orderNumber, orderNumber),
    with: {
      items: true,
      payments: true,
    },
  });

  if (!result) throw new NotFoundError("order", orderNumber);
  return result;
}
