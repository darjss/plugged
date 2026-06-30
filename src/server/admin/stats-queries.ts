import { and, asc, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { db } from "../db";
import { order, payment, product, productVariant } from "../db/schema";

/**
 * Low-stock threshold shared between the stats aggregate and the
 * low-stock product list so the counts always agree.
 */
export const LOW_STOCK_THRESHOLD = 5;

/** Start of the current day in UTC (project timezone is UTC). */
function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Admin-only commerce aggregates. Kept separate from `commerceQueries`
 * so the storefront-facing query surface stays thin; these are only
 * mounted on routes guarded by `requireAdmin`.
 */
export const adminStatsQueries = {
  /**
   * Today's stats: order count, revenue (sum of successful payments
   * paid today), pending order count, and distinct product count with
   * at least one variant below the low-stock threshold.
   */
  async getStats() {
    const start = startOfTodayUtc();

    const [todayOrders] = await db
      .select({ value: count() })
      .from(order)
      .where(gte(order.createdAt, start));

    const [revenue] = await db
      .select({ value: sum(payment.amountMnt) })
      .from(payment)
      .where(and(eq(payment.status, "success"), gte(payment.paidAt, start)));

    const [pending] = await db
      .select({ value: count() })
      .from(order)
      .where(eq(order.status, "pending"));

    const [lowStock] = await db
      .select({
        value: sql<number>`count(distinct ${productVariant.productId})`,
      })
      .from(productVariant)
      .where(sql`${productVariant.stockQuantity} < ${LOW_STOCK_THRESHOLD}`);

    return {
      todayOrderCount: todayOrders?.value ?? 0,
      todayRevenue: Number(revenue?.value ?? 0),
      pendingOrderCount: pending?.value ?? 0,
      lowStockCount: Number(lowStock?.value ?? 0),
    };
  },

  /**
   * Most recent orders with their payments attached, for the dashboard
   * home table. Caller controls the limit (server clamps it).
   */
  async getRecentOrders(limit: number) {
    return db.query.order.findMany({
      orderBy: [desc(order.createdAt)],
      limit,
      with: {
        payments: true,
      },
    });
  },

  /**
   * Variants below the low-stock threshold joined to their product, for
   * the dashboard home alerts list. Ordered by stock ascending so the
   * most depleted SKUs surface first.
   */
  async getLowStockProducts() {
    return db
      .select({
        productSlug: product.slug,
        productName: product.name,
        variantName: productVariant.name,
        sku: productVariant.sku,
        stockQuantity: productVariant.stockQuantity,
      })
      .from(productVariant)
      .innerJoin(product, eq(productVariant.productId, product.id))
      .where(sql`${productVariant.stockQuantity} < ${LOW_STOCK_THRESHOLD}`)
      .orderBy(asc(productVariant.stockQuantity));
  },
};
