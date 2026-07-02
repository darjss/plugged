/**
 * Shared commerce constants. Lives outside the server so client islands
 * can value-import picklists and the delivery fee without pulling the
 * Drizzle schema (and every sqliteTable) into browser bundles. The
 * server schema re-exports these, so `@/server/db/schema` imports keep
 * working for server code.
 */
export const productStatuses = ["draft", "active", "archived"] as const;
export const orderStatuses = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export const paymentProviders = ["qpay", "transfer", "cash"] as const;
export const paymentStatuses = ["pending", "customer_claimed_paid", "success", "failed"] as const;
export const deliveryProviders = ["tu-delivery", "self", "avidaa", "pick-up"] as const;
export const deliveryFeeMnt = 6000;
