import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import * as v from "valibot";
import { db } from "../db";
import { order, orderStatuses, payment } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { now } from "../lib/datetime";
import { imageOrderBy } from "../lib/drizzle-helpers";
import {
  shapeAdminOrderListRow,
  shapeAdminOrderDetail,
  shapeAdminOrderStatusPatch,
} from "./admin-shaping";
import { adminListOrdersSchema } from "./validation";

/**
 * List orders for the admin console with filters + pagination.
 * Uses the relational query API so each order carries its primary
 * payment (most recently updated) and optional customer account.
 *
 * Returns the flat API shape consumed by the admin orders table
 * (Eden Treaty infers this shape for the client). The raw Drizzle
 * relational rows are projected here so the route handler is a
 * thin `return commerceQueries.admin.listOrders(filters)`.
 */
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

  // The row query and the total-count query are independent reads, so
  // dispatch them as a single D1 batch (one round trip) instead of two
  // sequential queries.
  const [rows, countRows] = await db.batch([
    db.query.order.findMany({
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
        items: {
          limit: 4,
          orderBy: (i, { asc }) => [asc(i.createdAt)],
          columns: { productName: true, productId: true },
          with: {
            product: {
              with: {
                images: {
                  orderBy: imageOrderBy,
                  limit: 1,
                  columns: { url: true, alt: true },
                },
              },
            },
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(order)
      .where(where),
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    orders: rows.map(shapeAdminOrderListRow),
    total,
    limit,
    offset,
  };
}

/**
 * Full order for the admin detail view: items (with product image +
 * variant), payments, and the optional customer account.
 *
 * Returns the flat API shape consumed by the admin order detail view.
 */
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
  return shapeAdminOrderDetail(result);
}

/**
 * Update an order's status. Allowed transitions:
 *   pending → shipped → delivered
 *   pending → cancelled
 * Throws ConflictError for any other transition.
 *
 * Returns the small status-patch projection the admin detail view
 * consumes after a status mutation (id/status/cancelledAt/updatedAt).
 */
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

  return shapeAdminOrderStatusPatch(id, nextStatus, nextStatus === "cancelled" ? date : null, date);
}
