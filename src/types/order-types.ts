import type { Treaty } from "@elysiajs/eden";
import type { api } from "@/lib/api-client";

// Derived from the Eden Treaty response for `GET /orders?phone=` so the
// order-history and order-tracking islands share the server's inferred
// shape (Drizzle relational rows) without hand-maintained DTOs. Timestamp
// fields are `Date`: Eden's default `parseDate` revives ISO strings on
// the client, matching the server-side Drizzle types.

export type OrdersResponse = Treaty.Data<typeof api.orders.get>;
export type OrderRow = OrdersResponse["orders"][number];
export type OrderItem = OrderRow["items"][number];
export type OrderPayment = OrderRow["payments"][number];

export const statusVariant: Record<
  string,
  "default" | "stamp" | "success" | "warning" | "destructive" | "secondary"
> = {
  pending: "warning",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

export const statusLabel: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const paymentStatusLabel: Record<string, string> = {
  pending: "Pending",
  customer_claimed_paid: "Marked as paid",
  success: "Successful",
  failed: "Failed",
};
