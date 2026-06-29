import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import * as v from "valibot";
import { db } from "../db";
import { order, orderStatuses, payment } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { now } from "../lib/datetime";
import { imageOrderBy } from "../lib/drizzle-helpers";
import { adminListOrdersSchema } from "../commerce/validation";

export async function listOrders(rawFilters: v.InferOutput<typeof adminListOrdersSchema>) {
  const filters = rawFilters;
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  const conditions = [];

  if (filters.status) conditions.push(eq(order.status, filters.status));

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    if (!Number.isNaN(from.getTime())) conditions.push(gte(order.orderedAt, from));
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    if (!Number.isNaN(to.getTime())) conditions.push(lte(order.orderedAt, to));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(like(order.orderNumber, term), like(order.customerPhone, term))!);
  }

  if (filters.paymentStatus) {
    // Subquery: orders that have at least one payment with the given status.
    conditions.push(
      sql`${order.id} IN (
        SELECT ${payment.orderId} FROM ${payment}
        WHERE ${payment.status} = ${filters.paymentStatus}
      )`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.query.order.findMany({
    where,
    orderBy: desc(order.orderedAt),
    limit,
    offset,
    with: {
      user: {
        columns: { email: true, name: true, phoneNumber: true },
      },
      payments: {
        orderBy: (p, { desc }) => [desc(p.updatedAt)],
        limit: 1,
        columns: {
          status: true,
          provider: true,
          paymentNumber: true,
        },
      },
    },
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(order)
    .where(where);

  return {
    orders: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerPhone: o.customerPhone,
      customerName: o.customerName,
      status: o.status,
      subtotalMnt: o.subtotalMnt,
      deliveryFeeMnt: o.deliveryFeeMnt,
      totalMnt: o.totalMnt,
      orderedAt: o.orderedAt,
      createdAt: o.createdAt,
      user: o.user
        ? {
            email: o.user.email,
            name: o.user.name,
            phoneNumber: o.user.phoneNumber,
          }
        : null,
      payment: o.payments[0]
        ? {
            status: o.payments[0].status,
            provider: o.payments[0].provider,
            paymentNumber: o.payments[0].paymentNumber,
          }
        : null,
    })),
    total: Number(count),
    limit,
    offset,
  };
}

export async function getOrder(id: string) {
  const result = await db.query.order.findFirst({
    where: eq(order.id, id),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: {
                orderBy: imageOrderBy,
                limit: 1,
              },
            },
          },
          variant: true,
        },
      },
      payments: {
        orderBy: (p, { desc }) => [desc(p.updatedAt)],
      },
      user: true,
    },
  });

  if (!result) throw new NotFoundError("order", id);

  return {
    id: result.id,
    orderNumber: result.orderNumber,
    customerPhone: result.customerPhone,
    customerName: result.customerName,
    status: result.status,
    subtotalMnt: result.subtotalMnt,
    deliveryFeeMnt: result.deliveryFeeMnt,
    totalMnt: result.totalMnt,
    address: result.address,
    deliveryProvider: result.deliveryProvider,
    notes: result.notes,
    orderedAt: result.orderedAt,
    createdAt: result.createdAt,
    cancelledAt: result.cancelledAt,
    user: result.user
      ? {
          email: result.user.email,
          name: result.user.name,
          phoneNumber: result.user.phoneNumber,
        }
      : null,
    items: result.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      unitPriceMnt: item.unitPriceMnt,
      quantity: item.quantity,
      lineTotalMnt: item.lineTotalMnt,
      product: {
        slug: item.product.slug,
        image: item.product.images[0]
          ? {
              url: item.product.images[0].url,
              alt: item.product.images[0].alt,
            }
          : null,
      },
    })),
    payments: result.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      provider: p.provider,
      status: p.status,
      amountMnt: p.amountMnt,
      qpayInvoiceId: p.qpayInvoiceId,
      paidAt: p.paidAt,
    })),
  };
}

// Allowed transitions: pending → paid/shipped/delivered/cancelled,
// paid → shipped/delivered/cancelled/refunded, shipped → delivered.
// Throws ConflictError for any other transition.
export async function updateOrderStatus(id: string, nextStatus: (typeof orderStatuses)[number]) {
  if (!orderStatuses.includes(nextStatus)) {
    throw new ConflictError(`Invalid order status: ${nextStatus}`);
  }

  const current = await db.query.order.findFirst({
    where: eq(order.id, id),
    columns: { id: true, status: true },
  });

  if (!current) throw new NotFoundError("order", id);

  const allowed: Record<string, string[]> = {
    pending: ["paid", "shipped", "delivered", "cancelled"],
    paid: ["shipped", "delivered", "cancelled", "refunded"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
  };

  const allowedNext = allowed[current.status] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    throw new ConflictError(`Cannot transition order from ${current.status} to ${nextStatus}`);
  }

  const date = now();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updatedAt: date,
  };
  if (nextStatus === "cancelled") patch.cancelledAt = date;

  await db.update(order).set(patch).where(eq(order.id, id));

  return {
    id,
    status: nextStatus,
    cancelledAt: nextStatus === "cancelled" ? date : null,
    updatedAt: date,
  };
}
